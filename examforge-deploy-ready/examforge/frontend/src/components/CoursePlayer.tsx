import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Maximize, Minimize, RotateCcw, RotateCw, Bookmark, Gauge } from "lucide-react";
import { useT } from "../lib/i18n";

declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }
let ytReady: Promise<any> | null = null;
const loadYT = () => (ytReady ??= new Promise((res, rej) => {
  if (window.YT?.Player) return res(window.YT);
  const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
  const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true; s.onerror = () => { ytReady = null; rej(new Error("The video player could not load. Check your internet connection.")); }; document.head.appendChild(s);
}));

export interface PlayerApi { time: () => number; seek: (sec: number) => void }
export const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const clock = (sec: number) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`; };
const savedRate = () => { try { const r = Number(localStorage.getItem("ef_rate")); return RATES.includes(r) ? r : 1; } catch { return 1; } };

/** YouTube lecture player with: speed control (remembered), ±10 s, one-tap bookmark, and a moving watermark with the student's name.
 *  Fullscreen is done on OUR wrapper (YouTube's own button is hidden) so the watermark stays on top of the video, also in fullscreen. */
export default function CoursePlayer({ videoId, bunnySrc, blob, startAt = 0, title, watermark, apiRef, onBookmark, onEnded, children }: { children?: ReactNode; videoId?: string; bunnySrc?: string | null; blob?: Blob | null; startAt?: number; title: string; watermark: string; apiRef: MutableRefObject<PlayerApi | null>; onBookmark?: () => void; onEnded?: () => void }) {
  const t = useT(); const wrap = useRef<HTMLDivElement>(null), mount = useRef<HTMLDivElement>(null), wm = useRef<HTMLDivElement>(null), player = useRef<any>(null);
  const [rate, setRate] = useState(savedRate), [err, setErr] = useState(""), [full, setFull] = useState(false), [pseudo, setPseudo] = useState(false), [pos, setPos] = useState({ x: 8, y: 12 }), [rateOpen, setRateOpen] = useState(false);
  const endedRef = useRef(onEnded); endedRef.current = onEnded; const rateRef = useRef(rate); rateRef.current = rate;

  const bunny = !!bunnySrc, local = !!blob, vid = useRef<HTMLVideoElement | null>(null), bunnyPlaying = useRef(false), bunnyApi = useRef<((o: object) => void) | null>(null);
  // Downloaded video: a plain <video> playing the saved file (works with no internet). Same speed, +-10 s, bookmarks and watermark.
  useEffect(() => {
    if (!blob) return; setErr(""); const url = URL.createObjectURL(blob), v = document.createElement("video"); vid.current = v;
    v.src = url; v.controls = true; v.playsInline = true; v.setAttribute("controlsList", "nodownload noremoteplayback nofullscreen"); v.disablePictureInPicture = true; v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;background:#000"; v.addEventListener("contextmenu", (e) => e.preventDefault());
    v.addEventListener("loadedmetadata", () => { v.playbackRate = rateRef.current; if (startAt > 0 && startAt < (v.duration || 1e9) - 10) v.currentTime = startAt; }); v.addEventListener("ended", () => endedRef.current?.()); v.addEventListener("error", () => setErr(t("This video is not available.")));
    mount.current?.appendChild(v);
    apiRef.current = { time: () => Math.floor(v.currentTime || 0), seek: (sec) => { v.currentTime = Math.max(0, sec); void v.play().catch(() => {}); } };
    return () => { apiRef.current = null; v.pause(); v.removeAttribute("src"); v.load(); vid.current = null; URL.revokeObjectURL(url); if (mount.current) mount.current.innerHTML = ""; };
  }, [blob]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bunny Stream: a signed iframe controlled through the player.js postMessage protocol (time, seek, ended).
  useEffect(() => {
    if (!bunnySrc) return; setErr(""); const frame = document.createElement("iframe"); frame.src = bunnySrc; frame.title = title; frame.allow = "accelerometer; encrypted-media; picture-in-picture"; frame.referrerPolicy = "strict-origin-when-cross-origin"; mount.current?.appendChild(frame);
    let last = 0; const send = (o: object) => frame.contentWindow?.postMessage(JSON.stringify({ context: "player.js", version: "0.0.11", ...o }), "*");
    bunnyApi.current = send; const on = (e: MessageEvent) => { if (e.source !== frame.contentWindow) return; let d: any = e.data; try { if (typeof d === "string") d = JSON.parse(d); } catch { return; } if (d?.context !== "player.js") return;
      if (d.event === "ready") { if (startAt > 0) send({ method: "setCurrentTime", value: startAt }); send({ method: "addEventListener", value: "timeupdate" }); send({ method: "addEventListener", value: "ended" }); send({ method: "addEventListener", value: "play" }); send({ method: "addEventListener", value: "pause" }); } else if (d.event === "play") bunnyPlaying.current = true; else if (d.event === "pause") bunnyPlaying.current = false; else if (d.event === "timeupdate") last = Math.floor(d.value?.seconds ?? 0); else if (d.event === "ended") endedRef.current?.(); };
    window.addEventListener("message", on); frame.addEventListener("load", () => { send({ method: "addEventListener", value: "ready" }); send({ method: "addEventListener", value: "timeupdate" }); send({ method: "addEventListener", value: "ended" }); });
    apiRef.current = { time: () => last, seek: (sec) => { send({ method: "setCurrentTime", value: Math.max(0, sec) }); send({ method: "play" }); } };
    return () => { window.removeEventListener("message", on); apiRef.current = null; if (mount.current) mount.current.innerHTML = ""; };
  }, [bunnySrc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!videoId) return;
    let dead = false; const host = document.createElement("div"); mount.current?.appendChild(host); setErr("");
    loadYT().then((YT) => { if (dead) return;
      player.current = new YT.Player(host, { videoId, host: "https://www.youtube-nocookie.com", width: "100%", height: "100%",
        playerVars: { start: Math.max(0, Math.floor(startAt)), rel: 0, modestbranding: 1, playsinline: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
        events: { onReady: () => { try { player.current.setPlaybackRate(rateRef.current); } catch { /* ignore */ } }, onStateChange: (e: any) => { if (e.data === 1) { try { player.current.setPlaybackRate(rateRef.current); } catch { /* ignore */ } } if (e.data === 0) endedRef.current?.(); }, onError: () => setErr(t("This video is not available.")) } });
    }).catch((e) => !dead && setErr(e.message));
    apiRef.current = { time: () => { try { return Math.floor(player.current?.getCurrentTime?.() ?? 0); } catch { return 0; } }, seek: (s) => { try { player.current?.seekTo?.(Math.max(0, s), true); player.current?.playVideo?.(); } catch { /* ignore */ } } };
    return () => { dead = true; apiRef.current = null; try { player.current?.destroy?.(); } catch { /* ignore */ } player.current = null; if (mount.current) mount.current.innerHTML = ""; };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Double-tap the left / right side of the video: 10 seconds back / forward. A single tap there plays or pauses. (The middle and the bottom strip stay free for the player's own controls.)
  const [flash, setFlash] = useState<{ side: -1 | 1; n: number } | null>(null); const lastTap = useRef<{ side: number; at: number }>({ side: 0, at: 0 }), single = useRef(0), hint = useRef(false);
  const [showHint, setShowHint] = useState(() => { try { return !localStorage.getItem("ef_tap_hint"); } catch { return false; } });
  useEffect(() => { if (!showHint) return; const id = setTimeout(() => { setShowHint(false); try { localStorage.setItem("ef_tap_hint", "1"); } catch { /* ignore */ } }, 5000); return () => clearTimeout(id); }, [showHint]);
  const toggle = () => {
    try { if (vid.current) { if (vid.current.paused) void vid.current.play().catch(() => {}); else vid.current.pause(); return; }
      if (bunny) { bunnyApi.current?.({ method: bunnyPlaying.current ? "pause" : "play" }); return; }
      const p = player.current; if (!p) return; if (p.getPlayerState?.() === 1) p.pauseVideo?.(); else p.playVideo?.(); } catch { /* ignore */ }
  };
  const onTap = (side: -1 | 1) => () => {
    const now = performance.now(), prev = lastTap.current; clearTimeout(single.current); hint.current = true;
    if (prev.side === side && now - prev.at < 320) { lastTap.current = { side: 0, at: 0 }; jump(side * 10); setFlash((f) => ({ side, n: (f?.n ?? 0) + 1 })); window.setTimeout(() => setFlash((f) => (f && f.side === side ? null : f)), 650); return; }
    lastTap.current = { side, at: now }; single.current = window.setTimeout(toggle, 330);
  };
  useEffect(() => () => clearTimeout(single.current), []);
  const pick = (r: number) => { setRate(r); setRateOpen(false); try { localStorage.setItem("ef_rate", String(r)); } catch { /* ignore */ } try { player.current?.setPlaybackRate?.(r); } catch { /* ignore */ } if (vid.current) vid.current.playbackRate = r; };
  const jump = (d: number) => { if (bunny || local) { apiRef.current?.seek(apiRef.current.time() + d); return; } const p = player.current; try { p?.seekTo?.(Math.max(0, (p.getCurrentTime?.() ?? 0) + d), true); } catch { /* ignore */ } };

  // The watermark drifts to a new random spot every few seconds, so it cannot be cropped out of a screen recording.
  useEffect(() => { const id = setInterval(() => setPos({ x: 4 + Math.random() * 56, y: 8 + Math.random() * 74 }), 6500); return () => clearInterval(id); }, []);
  // If someone hides or deletes the watermark with dev tools, the video is paused.
  useEffect(() => {
    const id = setInterval(() => { const el = wm.current; if (!el || !el.isConnected) return pausePlayer(); const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05 || el.textContent !== watermark) { el.textContent = watermark; pausePlayer(); } }, 2500);
    const pausePlayer = () => { try { player.current?.pauseVideo?.(); } catch { /* ignore */ } };
    return () => clearInterval(id);
  }, [watermark]);

  useEffect(() => { const f = () => setFull(!!document.fullscreenElement && document.fullscreenElement === wrap.current); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  useEffect(() => { if (!pseudo) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setPseudo(false); document.body.classList.add("vp-lock"); window.addEventListener("keydown", k); return () => { document.body.classList.remove("vp-lock"); window.removeEventListener("keydown", k); }; }, [pseudo]);
  const toggleFull = async () => {
    const el = wrap.current; if (!el) return;
    if (full) { try { await document.exitFullscreen(); } catch { /* ignore */ } return; } if (pseudo) { setPseudo(false); return; }
    try { if (el.requestFullscreen) await el.requestFullscreen(); else setPseudo(true); } catch { setPseudo(true); }
  };
  const on = full || pseudo;

  return <div ref={wrap} className={`vp ${pseudo ? "vp-pseudo" : ""}`} onContextMenu={(e) => e.preventDefault()}>
    <div className="vp-stage" aria-label={title}>
      <div ref={mount} className="vp-mount" />
      {err && <div className="vp-err" role="alert">{err}</div>}
      <div ref={wm} className="vp-wm" aria-hidden="true" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>{watermark}</div>
      <div className="vp-wm vp-wm-fixed" aria-hidden="true">{watermark}</div>
      <div className="vp-tap left" onPointerUp={onTap(-1)} aria-hidden="true">{flash?.side === -1 && <span key={flash.n} className="vp-flash"><RotateCcw size={22} />10s</span>}</div>
      <div className="vp-tap right" onPointerUp={onTap(1)} aria-hidden="true">{flash?.side === 1 && <span key={flash.n} className="vp-flash">10s<RotateCw size={22} /></span>}</div>
      {showHint && !err && <div className="vp-hint" aria-hidden="true">{t("Double-tap the left or right side to skip 10 seconds")}</div>}
      {children}
    </div>
    <div className="vp-bar">
      {!bunny && <div className="vp-rate">
        <button type="button" className="btn btn-sm" aria-haspopup="listbox" aria-expanded={rateOpen} onClick={() => setRateOpen((o) => !o)}><Gauge size={15} aria-hidden="true" />{rate}x</button>
        {rateOpen && <ul className="vp-menu" role="listbox" aria-label={t("Playback speed")}>{RATES.map((r) => <li key={r}><button type="button" role="option" aria-selected={r === rate} className={r === rate ? "on" : ""} onClick={() => pick(r)}>{r === 1 ? t("Normal") : `${r}x`}</button></li>)}</ul>}
      </div>}
      <button type="button" className="btn btn-sm" onClick={() => jump(-10)} aria-label={t("Back 10 seconds")}><RotateCcw size={15} aria-hidden="true" />10s</button>
      <button type="button" className="btn btn-sm" onClick={() => jump(10)} aria-label={t("Forward 10 seconds")}>10s<RotateCw size={15} aria-hidden="true" /></button>
      {onBookmark && <button type="button" className="btn btn-sm" onClick={onBookmark}><Bookmark size={15} aria-hidden="true" />{t("Bookmark")}</button>}
      <span style={{ flex: 1 }} />
      <button type="button" className="btn btn-sm" onClick={toggleFull} aria-label={on ? t("Exit full screen") : t("Full screen")}>{on ? <Minimize size={15} aria-hidden="true" /> : <Maximize size={15} aria-hidden="true" />}</button>
    </div>
  </div>;
}
