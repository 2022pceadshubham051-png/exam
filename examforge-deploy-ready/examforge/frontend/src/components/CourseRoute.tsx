import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react"; import { Link } from "react-router-dom";
import { Check, Lock, Flag, Clock, PlayCircle, RotateCcw, X, ClipboardCheck, ArrowLeft, ChevronRight, TrainFront, Map as MapIcon, ListOrdered } from "lucide-react";
import { confetti } from "./Confetti"; import { toast } from "./ui";

/** Course route. The course first shows its SUBJECTS; tapping a subject opens that subject's own railway line right inside the panel:
 *  lectures are numbered stations (tap one to see its lecture), a quiz is a traffic light that holds the train until the quiz is taken. */
export type Quiz = { id: string; name: string; taken: boolean };
export type Stop = { key: string; kind: "lesson" | "quiz"; lesson?: any; quiz?: Quiz; n?: number; done: boolean; final?: boolean };

/** Stops of one subject in order: lecture 1, [its quiz], lecture 2, ..., [the subject's final quiz]. */
export function buildStops(s: any): Stop[] {
  const out: Stop[] = [];
  (s.lessons ?? []).forEach((l: any, i: number) => {
    out.push({ key: l.id, kind: "lesson", lesson: l, n: i + 1, done: !!l.done });
    if (l.quiz) out.push({ key: `q-${l.id}`, kind: "quiz", quiz: l.quiz, done: !!l.quiz.taken });
  });
  if (s.quiz) out.push({ key: `q-s-${s.id}`, kind: "quiz", quiz: s.quiz, done: !!s.quiz.taken, final: true });
  return out;
}

/** Where the train stands: the first stop that is not done yet, in the first subject that is not finished. */
export function trainSpot(subjects: any[]): { subjectId: string; idx: number; stop: Stop; held: boolean } | null {
  for (const s of subjects) { const st = buildStops(s), idx = st.findIndex((x) => !x.done); if (idx >= 0) return { subjectId: s.id, idx, stop: st[idx], held: st[idx].kind === "quiz" }; }
  return null;
}

const reduced = () => typeof document !== "undefined" && (document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ geometry (pure maths, no DOM) */
const W = 340, STEP = 96, PAD = 58, SEG_SAMPLES = 40;
type P = { x: number; y: number };
type Geo = { H: number; nodes: (P & { s: number })[]; segs: string[]; full: string; pts: (P & { s: number })[]; total: number };

const cubic = (a: P, b: P, c: P, d: P, t: number): P => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y }; };

/** A zig-zag of S-curves: station i sits left or right, the line swings smoothly between them and runs off the map at both ends. */
function makeGeo(n: number): Geo {
  const H = Math.max(230, PAD * 2 + (n - 1) * STEP), top = n === 1 ? H / 2 : PAD;
  const nodes0: P[] = Array.from({ length: n }, (_, i) => ({ x: (i % 2 ? 252 : 88) + [-12, 0, 12][i % 3] * (i % 2 ? -1 : 1), y: top + i * STEP }));
  const list: P[] = [{ x: nodes0[0].x, y: nodes0[0].y - 80 }, ...nodes0, { x: nodes0[n - 1].x, y: nodes0[n - 1].y + 80 }];
  const segs: string[] = [], pts: (P & { s: number })[] = [], nodes: (P & { s: number })[] = []; let s = 0, prev: P | null = null;
  for (let k = 0; k <= n; k++) {
    const a = list[k], b = list[k + 1], d = (b.y - a.y) * 0.55, c1 = { x: a.x, y: a.y + d }, c2 = { x: b.x, y: b.y - d };
    segs.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    for (let j = k === 0 ? 0 : 1; j <= SEG_SAMPLES; j++) { const p = cubic(a, c1, c2, b, j / SEG_SAMPLES); if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; pts.push({ ...p, s }); }
    if (k < n) nodes.push({ ...nodes0[k], s });
  }
  // one continuous path (the glowing trail behind the train is drawn along it)
  const full = segs.map((d, k) => (k === 0 ? d : d.replace(/^M[^C]*/, ""))).join(" ");
  return { H, nodes, segs, full, pts, total: s };
}

/** Point at distance `s` along the line; past either end it carries straight on, so the train can roll in from outside the map. */
function at(g: Geo, s: number): P {
  const p = g.pts; if (s <= 0) { const d = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1; return { x: p[0].x + ((p[1].x - p[0].x) / d) * s, y: p[0].y + ((p[1].y - p[0].y) / d) * s }; }
  const m = p.length; if (s >= g.total) { const a = p[m - 2], b = p[m - 1], d = Math.hypot(b.x - a.x, b.y - a.y) || 1, e = s - g.total; return { x: b.x + ((b.x - a.x) / d) * e, y: b.y + ((b.y - a.y) / d) * e }; }
  let lo = 0, hi = m - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p[mid].s <= s) lo = mid; else hi = mid; }
  const a = p[lo], b = p[hi], k = (s - a.s) / ((b.s - a.s) || 1); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
const heading = (g: Geo, s: number) => { const a = at(g, s - 5), b = at(g, s + 5); return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI; };

const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

/** Green country around the line: fields, trees, a pond, flowers. Seeded by the subject so it never changes between visits. */
function scenery(g: Geo, seed: string) {
  const r = rng(hash(seed)), near = (x: number, y: number, d: number) => g.pts.some((p, i) => i % 3 === 0 && Math.hypot(p.x - x, p.y - y) < d);
  const fields: { x: number; y: number; w: number; h: number; c: string }[] = [], trees: { x: number; y: number; r: number; c: number }[] = [], flowers: { x: number; y: number; c: string }[] = []; let pond: { x: number; y: number; rx: number; ry: number } | null = null;
  for (let i = 0; i < Math.ceil(g.H / 150) + 1; i++) { const w = 58 + r() * 40, h = 40 + r() * 34, x = r() * (W - w), y = r() * (g.H - h); if (!near(x + w / 2, y + h / 2, 64) && !near(x, y, 40) && !near(x + w, y + h, 40)) fields.push({ x, y, w, h, c: r() > 0.5 ? "#a8d97a" : "#c4e08a" }); }
  for (let t = 0; t < 40 && !pond; t++) { const x = 30 + r() * (W - 60), y = 30 + r() * (g.H - 60); if (!near(x, y, 62)) pond = { x, y, rx: 24 + r() * 10, ry: 14 + r() * 6 }; }
  for (let t = 0; t < 420 && trees.length < Math.ceil(g.H / 15); t++) { const x = r() * W, y = r() * g.H, rad = 8 + r() * 7;
    if (near(x, y, 40 + rad) || trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad - 2) || (pond && Math.hypot((pond.x - x) / (pond.rx + 12), (pond.y - y) / (pond.ry + 12)) < 1)) continue; trees.push({ x, y, r: rad, c: Math.floor(r() * 3) }); }
  for (let t = 0; t < 160 && flowers.length < 34; t++) { const x = r() * W, y = r() * g.H; if (!near(x, y, 30) && !trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 2)) flowers.push({ x, y, c: ["#fff", "#ffd166", "#ff9ec4"][Math.floor(r() * 3)] }); }
  const clouds = Array.from({ length: Math.max(2, Math.min(4, Math.round(g.H / 380))) }, (_, k) => ({ y: 40 + r() * (g.H - 80), s: 0.8 + r() * 0.7, dur: 70 + k * 21 + r() * 20, delay: -(r() * 70) }));
  return { fields, trees, pond, flowers, clouds };
}
const TREE = [["#2e8b4f", "#45ad69"], ["#277a46", "#3c9a5c"], ["#3a9a55", "#58bd78"]];

/** The static green country (never re-rendered while the train moves or a card opens). */
type Scene = ReturnType<typeof scenery>;
const Country = memo(function Country({ geo, id, sc }: { geo: Geo; id: string; sc: Scene }) {
  return <>
    <defs><pattern id={`m-${id}`} width="340" height="26" patternUnits="userSpaceOnUse"><rect width="340" height="13" fill="#fff" opacity=".07" /></pattern></defs>
    <g className="rt-bg"><rect width={W} height={geo.H} fill="#7fc962" /><rect width={W} height={geo.H} fill={`url(#m-${id})`} />
      {sc.fields.map((f, i) => <g key={i}><rect x={f.x} y={f.y} width={f.w} height={f.h} rx="5" fill={f.c} />{Array.from({ length: Math.floor(f.h / 7) }, (_, j) => <line key={j} x1={f.x + 3} x2={f.x + f.w - 3} y1={f.y + 5 + j * 7} y2={f.y + 5 + j * 7} stroke="#8cc05f" strokeWidth="1.4" opacity=".7" />)}</g>)}
      {sc.pond && <g><ellipse cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx + 3} ry={sc.pond.ry + 3} fill="#d8c79a" /><ellipse cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx} ry={sc.pond.ry} fill="#58b6e6" />
        <ellipse className="rt-ripple" cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx * 0.55} ry={sc.pond.ry * 0.55} fill="none" stroke="#fff" strokeWidth="1.2" />
        <ellipse cx={sc.pond.x - sc.pond.rx * 0.3} cy={sc.pond.y - sc.pond.ry * 0.25} rx={sc.pond.rx * 0.4} ry={sc.pond.ry * 0.22} fill="#fff" opacity=".45" /></g>}
      {sc.flowers.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r="1.6" fill={f.c} />)}
      {sc.trees.map((tr, i) => <g key={i}><ellipse cx={tr.x + 3} cy={tr.y + 4} rx={tr.r} ry={tr.r * 0.9} fill="#000" opacity=".16" /><circle cx={tr.x} cy={tr.y} r={tr.r} fill={TREE[tr.c][0]} /><circle cx={tr.x - tr.r * 0.22} cy={tr.y - tr.r * 0.25} r={tr.r * 0.62} fill={TREE[tr.c][1]} /><circle cx={tr.x - tr.r * 0.35} cy={tr.y - tr.r * 0.4} r={tr.r * 0.22} fill="#fff" opacity=".22" /></g>)}</g>
  </>;
});

/** Soft clouds drifting over the map (drawn above the train, very light). */
const Clouds = memo(function Clouds({ sc }: { sc: Scene }) {
  return <g className="rt-clouds" aria-hidden="true">{sc.clouds.map((c, k) => <g key={k} className="rt-cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
    <g transform={`translate(0 ${c.y}) scale(${c.s})`}><g opacity=".1" transform="translate(10 26)"><ellipse rx="26" ry="9" fill="#000" /><ellipse cx="22" cy="2" rx="18" ry="7" fill="#000" /></g>
      <ellipse rx="26" ry="9" fill="#fff" /><ellipse cx="-14" cy="3" rx="16" ry="7" fill="#fff" /><ellipse cx="22" cy="2" rx="18" ry="7" fill="#fff" /><ellipse cx="4" cy="-5" rx="14" ry="7" fill="#fff" /></g></g>)}</g>;
});

/* ------------------------------------------------------------------ the train, seen from above */
const CARS: [number, "engine" | "coach"][] = [[0, "engine"], [-28, "coach"], [-53, "coach"], [-78, "coach"]];

/** The train. It is driven straight on the SVG (no React re-render per frame): smooth-step easing, a little sway while rolling, smoke that speeds up, a glowing trail behind it. */
function Train({ g, target, from, held, trail, onArrive }: { g: Geo; target: number; from: number; held: boolean; trail: RefObject<SVGGElement>; onArrive: () => void }) {
  const root = useRef<SVGGElement>(null), cars = useRef<(SVGGElement | null)[]>([]), pos = useRef(from), raf = useRef(0), arrive = useRef(onArrive); arrive.current = onArrive;
  const place = (L: number, sway: number) => {
    CARS.forEach(([off], i) => { const el = cars.current[i]; if (!el) return; const s = L + off, p = at(g, s), a = heading(g, s), w = sway * Math.sin(i * 1.9 + performance.now() / 70);
      el.setAttribute("transform", `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${a.toFixed(2)}) translate(0 ${w.toFixed(2)})`); });
    if (trail.current) trail.current.style.strokeDashoffset = String(1000 - 1000 * clamp((L - 4) / g.total, 0, 1));
  };
  useLayoutEffect(() => { place(pos.current, 0); }, [g]); // eslint-disable-line
  useEffect(() => {
    cancelAnimationFrame(raf.current); const el = root.current, start = pos.current, delta = target - start;
    const stop = () => { if (el) delete el.dataset.go; };
    if (Math.abs(delta) < 1 || reduced()) { pos.current = target; place(target, 0); stop(); return; }
    const dur = clamp((Math.abs(delta) / 70) * 1000, 1500, 4800), t0 = performance.now() + 420;
    const step = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1), e = k * k * k * (k * (6 * k - 15) + 10), speed = (30 * k * k * (1 - k) * (1 - k)) / 1.875; // smootherstep: zero speed AND zero acceleration at both ends
      pos.current = start + delta * e; place(pos.current, 0.3 * speed);
      if (el) { if (k > 0 && k < 1) { el.dataset.go = "1"; el.style.setProperty("--spd", speed.toFixed(2)); } else stop(); }
      if (k < 1) raf.current = requestAnimationFrame(step); else { place(target, 0); arrive.current(); }
    };
    raf.current = requestAnimationFrame(step); return () => cancelAnimationFrame(raf.current);
  }, [target, g]); // eslint-disable-line
  return <g ref={root} className={`rt-train ${held ? "held" : ""}`}>
    {CARS.map(([, kind], i) => <g key={i} ref={(el) => { cars.current[i] = el; }} className="rt-car">
      {kind === "engine" ? <>
        <polygon className="rt-beam" points="14,0 60,-18 60,18" />
        <rect x="-13" y="-4" width="30" height="13" rx="5" transform="translate(2.2 3.4)" fill="#000" opacity=".22" /><rect x="-17" y="-1.2" width="3" height="2.4" fill="#2b313c" />
        <rect x="-15" y="-6.5" width="30" height="13" rx="4.5" fill="var(--brand)" /><rect x="-15" y="-6.5" width="11" height="13" rx="3" fill="var(--brand-hover)" />
        <rect x="-3" y="-4.6" width="17" height="9.2" rx="4" fill="var(--brand-2)" /><rect x="-13" y="-0.8" width="27" height="1.6" fill="var(--gold)" /><circle cx="2" cy="0" r="2.1" fill="var(--gold)" /><circle cx="9" cy="0" r="2.7" fill="#1d2230" /><circle cx="9" cy="0" r="1.3" fill="#6b7585" />
        <rect x="-12" y="-4" width="6" height="8" rx="1.5" fill="#1d2230" opacity=".55" /><circle className="rt-lamp" cx="15" cy="-3.4" r="1.7" fill="#fff3b0" /><circle className="rt-lamp" cx="15" cy="3.4" r="1.7" fill="#fff3b0" />
        <g className="rt-smoke"><circle cx="9" cy="0" r="3" /><circle cx="9" cy="0" r="3" /><circle cx="9" cy="0" r="3" /></g></>
      : <><rect x="-9.5" y="-4" width="23" height="12" rx="3" transform="translate(2.2 3.4)" fill="#000" opacity=".22" /><rect x="11" y="-1.1" width="4.5" height="2.2" fill="#2b313c" />
        <rect x="-11.5" y="-6" width="23" height="12" rx="3" fill="var(--brand-2)" /><rect x="-9.5" y="-4" width="19" height="8" rx="2" fill="var(--brand-soft)" /><path d="M-4 -4v8M2 -4v8M8 -4v8" stroke="var(--brand-2)" strokeWidth="1.2" opacity=".7" /></>}
    </g>)}
  </g>;
}

type TFn = (k: string, v?: any) => string;

/* ------------------------------------------------------------------ one subject's line (the map) */
function Line({ s, stops, here, complete, spot, active, lid, open, t, sel, setSel }: { s: any; stops: Stop[]; here: boolean; complete: boolean; spot: { idx: number; held: boolean } | null; active: boolean; lid: string | null; open: (l: any) => void; t: TFn; sel: string | null; setSel: (k: string | null) => void }) {
  const n = stops.length, geo = useMemo(() => makeGeo(n), [n]), sc = useMemo(() => scenery(geo, s.id), [geo, s.id]), trail = useRef<SVGGElement>(null);
  const target = !active ? null : here && spot ? geo.nodes[spot.idx].s - 34 : complete ? geo.nodes[n - 1].s + 56 : null;
  // the train rolls in on the last stretch (a run-up before the previous stop), so opening a subject always shows it arriving
  const [from] = useState(() => (here && spot ? Math.max(-70, (spot.idx > 0 ? geo.nodes[spot.idx - 1].s - 34 : -70) - 60) : complete ? Math.max(-70, geo.nodes[n - 1].s - 240) : -70));
  const held = here && !!spot?.held, arriveAt = here && spot ? spot.idx : complete ? n - 1 : -1;
  const [arrived, setArrived] = useState(-1); const tm = useRef(0);
  useEffect(() => () => clearTimeout(tm.current), []);
  const onArrive = () => { setArrived(arriveAt); clearTimeout(tm.current); tm.current = window.setTimeout(() => setArrived(-1), 1500); };
  const segDone = (k: number) => (k === 0 ? here || complete : k === n ? complete : stops[k - 1].done);
  const chosen = stops.findIndex((x) => x.key === sel), cs = chosen >= 0 ? stops[chosen] : null, cp = chosen >= 0 ? geo.nodes[chosen] : null;
  return <div className="rt-map" style={{ aspectRatio: `${W} / ${geo.H}` }}>
    <svg className="rt-svg" viewBox={`0 0 ${W} ${geo.H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Country geo={geo} id={s.id} sc={sc} />
      {geo.segs.map((d, k) => <g key={k} className={`rt-seg ${segDone(k) ? "on" : ""}`}><path d={d} className="b" /><path d={d} className="sl" /><path d={d} className="r1" /><path d={d} className="r2" /></g>)}
      <g ref={trail} className="rt-trail" style={{ strokeDashoffset: 1000 }}><path d={geo.full} pathLength={1000} className="w" /><path d={geo.full} pathLength={1000} className="n" /></g>
      {target !== null && <Train g={geo} target={target} from={from} held={held} trail={trail} onArrive={onArrive} />}
      <Clouds sc={sc} />
    </svg>
    {stops.map((x, i) => { const p = geo.nodes[i], style = { left: `${(p.x / W) * 100}%`, top: `${(p.y / geo.H) * 100}%`, "--i": i } as CSSProperties, isHere = here && spot?.idx === i, on = sel === x.key, ring = arrived === i ? "arrive" : "";
      if (x.kind === "quiz") { const state = x.done ? "clear" : isHere ? "held" : "ahead";
        return <button key={x.key} type="button" style={style} className={`rt-pin rt-tl ${state} ${on ? "sel" : ""} ${ring}`} data-here={isHere || undefined} aria-expanded={on} aria-label={`${x.final ? t("Final quiz") : t("Quiz signal")}: ${x.quiz!.name}`} onClick={() => setSel(on ? null : x.key)}>
          <i className="lamp r" /><i className="lamp y" /><i className="lamp g" /></button>; }
      const l = x.lesson;
      return <button key={x.key} type="button" style={style} className={`rt-pin rt-st-pin ${x.done ? "done" : ""} ${isHere ? "here" : ""} ${l.locked ? "locked" : ""} ${on ? "sel" : ""} ${l.id === lid ? "cur" : ""} ${ring}`} data-here={isHere || undefined} aria-expanded={on} aria-label={`${t("Station {n}", { n: x.n })}: ${l.title}`} onClick={() => setSel(on ? null : x.key)}>
        {x.n}{x.done && <b className="badge"><Check size={11} strokeWidth={4} /></b>}{l.locked && !x.done && <b className="badge lock"><Lock size={10} /></b>}</button>; })}
    {cs && cp && <div className={`rt-pop ${cp.y / geo.H > 0.55 ? "up" : "down"}`} role="dialog" aria-label={cs.kind === "lesson" ? cs.lesson.title : cs.quiz!.name}
      style={{ left: `clamp(124px, ${(cp.x / W) * 100}%, calc(100% - 124px))`, ...(cp.y / geo.H > 0.55 ? { bottom: `calc(${(1 - cp.y / geo.H) * 100}% + 34px)` } : { top: `calc(${(cp.y / geo.H) * 100}% + 34px)` }) }}>
      <button type="button" className="rt-pop-x" aria-label={t("Close")} onClick={() => setSel(null)}><X size={14} /></button>
      {cs.kind === "lesson" ? <>
        <small className="rt-st">{t("Station {n}", { n: cs.n })}{cs.lesson.durationMin ? <> · <Clock size={11} aria-hidden="true" /> {t("{n} min", { n: cs.lesson.durationMin })}</> : null}</small>
        <b className="rt-pop-t">{cs.lesson.title}</b>
        <span className={`rt-pop-s ${cs.done ? "ok" : ""}`}>{cs.done ? <><Check size={13} /> {t("Completed")}</> : cs.lesson.locked ? <><Lock size={12} /> {t("Locked")}</> : here && spot?.idx === chosen ? t("You are here") : t("Not started")}</span>
        <button type="button" className="btn btn-primary btn-sm rt-go" onClick={() => open(cs.lesson)}><PlayCircle size={15} aria-hidden="true" />{t("Open lecture")}</button></>
      : <>
        <small className="rt-st">{cs.final ? t("Final quiz") : t("Quiz signal")}</small><b className="rt-pop-t"><ClipboardCheck size={14} aria-hidden="true" /> {cs.quiz!.name}</b>
        <span className={`rt-pop-s ${cs.done ? "ok" : here && spot?.idx === chosen ? "hold" : ""}`}>{cs.done ? <><Check size={13} /> {t("Quiz cleared")}</> : here && spot?.idx === chosen ? t("Train on hold") : t("Upcoming")}</span>
        {active ? <Link className={`btn btn-sm rt-go ${cs.done ? "" : "btn-primary"}`} to={`/exam/${cs.quiz!.id}`}>{cs.done ? <><RotateCcw size={14} aria-hidden="true" />{t("Retake quiz")}</> : t("Start quiz")}</Link>
          : <span className="sub row" style={{ gap: 6 }}><Lock size={13} aria-hidden="true" />{t("Enroll to take this quiz.")}</span>}</>}
    </div>}
  </div>;
}

/* ------------------------------------------------------------------ the same stops as a plain list */
function StopList({ stops, here, spot, lid, active, open, t }: { stops: Stop[]; here: boolean; spot: { idx: number; held: boolean } | null; lid: string | null; active: boolean; open: (l: any) => void; t: TFn }) {
  return <ol className="rt-list">{stops.map((x, i) => { const isHere = here && spot?.idx === i, st = { "--i": i } as CSSProperties;
    if (x.kind === "quiz") { const state = x.done ? "clear" : isHere ? "held" : "ahead";
      return <li key={x.key} style={st}><div className={`rt-row quiz ${state}`} data-here={isHere || undefined}>
        <span className="rt-row-tl" aria-hidden="true"><i className="lamp r" /><i className="lamp y" /><i className="lamp g" /></span>
        <span className="rt-row-t"><b>{x.quiz!.name}</b><small>{x.final ? t("Final quiz") : t("Quiz signal")} · {x.done ? t("Quiz cleared") : isHere ? t("Train on hold") : t("Upcoming")}</small></span>
        {active ? <Link className={`btn btn-sm ${x.done ? "" : "btn-primary"}`} to={`/exam/${x.quiz!.id}`}>{x.done ? <><RotateCcw size={14} aria-hidden="true" />{t("Retake quiz")}</> : t("Start quiz")}</Link> : <Lock size={14} aria-hidden="true" />}</div></li>; }
    const l = x.lesson;
    return <li key={x.key} style={st}><button type="button" className={`rt-row lesson ${x.done ? "done" : ""} ${isHere ? "here" : ""} ${l.locked ? "locked" : ""} ${l.id === lid ? "cur" : ""}`} data-here={isHere || undefined} onClick={() => open(l)}>
      <span className="rt-row-ico" aria-hidden="true">{x.done ? <Check size={16} strokeWidth={3.5} /> : l.locked ? <Lock size={14} /> : x.n}</span>
      <span className="rt-row-t"><b>{l.title}</b><small>{t("Station {n}", { n: x.n })}{l.durationMin ? <> · <Clock size={11} aria-hidden="true" /> {t("{n} min", { n: l.durationMin })}</> : null}{" · "}{x.done ? t("Completed") : l.locked ? t("Locked") : isHere ? t("You are here") : t("Not started")}</small></span>
      <PlayCircle size={20} aria-hidden="true" className="rt-row-go" /></button></li>; })}</ol>;
}

/* ------------------------------------------------------------------ a subject card (the overview) */
function SubjectCard({ s, i, stops, here, complete, active, onOpen, t }: { s: any; i: number; stops: Stop[]; here: boolean; complete: boolean; active: boolean; onOpen: () => void; t: TFn }) {
  const lessons = stops.filter((x) => x.kind === "lesson"), quizzes = stops.length - lessons.length, doneAll = stops.filter((x) => x.done).length, pct = stops.length ? Math.round((doneAll / stops.length) * 100) : 0;
  const body = <>
    <span className="rt-sc-no" aria-hidden="true">{complete ? <Check size={20} strokeWidth={3.5} /> : i + 1}</span>
    <span className="rt-sc-body">
      <b className="rt-sc-t">{s.name}</b>
      <span className="sub">{t("{done} of {total} stations", { done: lessons.filter((x) => x.done).length, total: lessons.length })}{quizzes > 0 ? ` · ${quizzes} ${t("quizzes")}` : ""}</span>
      {stops.length > 0 && <span className="rt-mini" aria-hidden="true">
        <i className="rt-mini-fill" style={{ width: `${pct}%` }} />
        {stops.map((x, k) => x.kind === "quiz" ? <b key={x.key} className={`rt-mini-q ${x.done ? "ok" : ""}`} style={{ left: `${((k + 0.5) / stops.length) * 100}%` }} /> : null)}
        {active && <TrainFront size={15} className={`rt-mini-train ${here ? "run" : ""}`} style={{ left: `${pct}%` }} />}
        <Flag size={12} className="rt-mini-flag" />
      </span>}
    </span>
    <span className="rt-sc-side">{active && <span className={`pill ${complete ? "pill-ok" : here ? "pill-brand" : ""}`}>{complete ? <><Flag size={12} aria-hidden="true" /> {t("Route complete")}</> : here ? t("Running") : t("Upcoming")}</span>}<ChevronRight size={18} className="rt-sc-go" aria-hidden="true" /></span></>;
  const cls = `rt-sc ${complete ? "is-done" : here ? "is-run" : ""}`, st = { "--i": i } as CSSProperties;
  return stops.length
    ? <button type="button" className={cls} style={st} onClick={onOpen} aria-label={`${s.name} · ${pct}%`}>{body}</button>
    : <div className={`${cls} empty`} style={st}><span className="rt-sc-no" aria-hidden="true">{i + 1}</span><span className="rt-sc-body"><b className="rt-sc-t">{s.name}</b><span className="sub">{t("Lessons are coming soon.")}</span></span></div>;
}

/* ------------------------------------------------------------------ the panel */
export default function CourseRoute({ c, lid, open, t, wide, active }: { c: any; lid: string | null; open: (l: any) => void; t: TFn; wide?: boolean; active: boolean }) {
  const root = useRef<HTMLElement>(null); const prevDone = useRef<number | null>(null); const userNav = useRef(false);
  const subjects: any[] = c.subjects ?? [];
  const subjOfLid: string | null = useMemo(() => subjects.find((s) => (s.lessons ?? []).some((l: any) => l.id === lid))?.id ?? null, [subjects, lid]);
  const [subId, setSubId] = useState<string | null>(subjOfLid ?? (subjects.length === 1 ? subjects[0].id : null));
  const [dir, setDir] = useState<"fwd" | "back">("fwd"); const [sel, setSel] = useState<string | null>(null); const [mode, setMode] = useState<"map" | "list">("map");
  const spot = useMemo(() => (active ? trainSpot(subjects) : null), [subjects, active]);
  const stats = useMemo(() => { let total = 0, done = 0; for (const s of subjects) for (const x of buildStops(s)) { total++; if (x.done) done++; } return { total, done }; }, [subjects]);
  const single = subjects.length === 1;
  const go = (id: string) => { userNav.current = true; setDir("fwd"); setSel(null); setSubId(id); };
  const back = () => { userNav.current = true; setDir("back"); setSel(null); setSubId(null); };

  // Playing a lecture of another subject (Next lesson, a link) brings that subject's route up.
  useEffect(() => { if (subjOfLid && subjOfLid !== subId) { setDir("fwd"); setSel(null); setSubId(subjOfLid); } }, [subjOfLid]); // eslint-disable-line

  // The train rolls on whenever one more stop gets done: say so, and celebrate when a whole subject is finished.
  useEffect(() => {
    if (!active) return; const before = prevDone.current; prevDone.current = stats.done; if (before === null || stats.done <= before) return;
    if (!spot) { confetti(110); toast(t("Route complete! You reached the last station. 🎉"), "ok"); return; }
    const s = subjects.find((x) => x.id === spot.subjectId), first = s ? buildStops(s).findIndex((x) => !x.done) === 0 : false;
    if (first) confetti(70, { x: 0.5, y: 0.3 });
    toast(spot.held ? t("Quiz signal ahead. Train is on hold.") : t("Train departing for Station {n}", { n: spot.stop.n }), "info");
  }, [stats.done]); // eslint-disable-line

  // Escape or a tap outside closes the lecture card.
  useEffect(() => {
    if (!sel) return; const key = (e: KeyboardEvent) => e.key === "Escape" && setSel(null), tap = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".rt-pin, .rt-pop")) setSel(null); };
    window.addEventListener("keydown", key); document.addEventListener("click", tap); return () => { window.removeEventListener("keydown", key); document.removeEventListener("click", tap); };
  }, [sel]);

  // Bring the right part into view after a view change: the top of the list, or the station where the train stands (inside the side list only, so the page itself does not jump).
  useEffect(() => {
    const box = root.current; if (!box) return; const beh: ScrollBehavior = reduced() ? "auto" : "smooth";
    if (!subId) { if (!userNav.current) return; if (wide) { if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start", behavior: beh }); } else box.scrollTo({ top: 0, behavior: beh }); return; }
    const id = window.setTimeout(() => {
      const el = box.querySelector<HTMLElement>("[data-here]"); if (!el) { if (userNav.current && !wide) box.scrollTo({ top: 0, behavior: beh }); return; }
      if (wide) { if (userNav.current) el.scrollIntoView({ block: "center", behavior: beh }); return; }
      const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(); box.scrollTo({ top: box.scrollTop + (r.top - b.top) - box.clientHeight / 2 + 40, behavior: beh });
    }, 420);
    return () => clearTimeout(id);
  }, [wide, subId, mode, spot?.stop.key]);

  const sub = subjects.find((x) => x.id === subId) ?? null;
  const renderSubject = (s: any) => {
    const stops = buildStops(s), complete = stops.length > 0 && stops.every((x) => x.done), here = spot?.subjectId === s.id, lessons = stops.filter((x) => x.kind === "lesson"), pct = stops.length ? (stops.filter((x) => x.done).length / stops.length) * 100 : 0;
    const sp = here && spot ? { idx: spot.idx, held: spot.held } : null;
    return <>
      <div className="rt-subhead">
        {!single && <button type="button" className="rt-back" onClick={back} aria-label={t("Back to subjects")}><ArrowLeft size={16} aria-hidden="true" /><span>{t("Subjects")}</span></button>}
        <div className="rt-subhead-t"><b>{s.name}</b><span className="sub">{t("{done} of {total} stations", { done: lessons.filter((x) => x.done).length, total: lessons.length })}</span></div>
        {active && <span className={`pill ${complete ? "pill-ok" : here ? "pill-brand" : ""}`}>{complete ? <><Flag size={12} aria-hidden="true" /> {t("Route complete")}</> : here ? t("Running") : t("Upcoming")}</span>}
      </div>
      {active && stops.length > 0 && <div className="rt-subprog route-prog" role="progressbar" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={stops.filter((x) => x.done).length} aria-label={t("Progress")}><i style={{ width: `${pct}%` }} /></div>}
      {stops.length ? <>
        <div className="rt-tabs" role="group" aria-label={t("Lectures")}>
          <button type="button" className={mode === "map" ? "on" : ""} aria-pressed={mode === "map"} onClick={() => setMode("map")}><MapIcon size={15} aria-hidden="true" />{t("Map")}</button>
          <button type="button" className={mode === "list" ? "on" : ""} aria-pressed={mode === "list"} onClick={() => setMode("list")}><ListOrdered size={15} aria-hidden="true" />{t("List")}</button>
        </div>
        {mode === "map" ? <><p className="sub route-hint">{t("Tap a station to see its lecture.")}</p><div className="rt-wrap"><Line key={s.id} s={s} stops={stops} here={here} complete={complete} spot={sp} active={active} lid={lid} open={open} t={t} sel={sel} setSel={setSel} /></div></>
          : <StopList stops={stops} here={here} spot={sp} lid={lid} active={active} open={open} t={t} />}</>
        : <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>}
    </>;
  };

  return <aside ref={root} className={`card curriculum route ${wide ? "wide" : ""}`} aria-label={t("Course content")}>
    <div className="curr-head route-head">
      <div style={{ minWidth: 0 }}><b>{t("Course route")}</b><span className="sub" style={{ display: "block" }}>{c.lessonCount} {t("lessons")}{c.enrollment === "ACTIVE" ? ` · ${c.progress}%` : ""}</span></div>
      {active && stats.total > 0 && <div className="route-prog" role="progressbar" aria-valuemin={0} aria-valuemax={stats.total} aria-valuenow={stats.done} aria-label={t("Progress")}><i style={{ width: `${(stats.done / stats.total) * 100}%` }} /></div>}
    </div>
    {subjects.length ? <div key={sub?.id ?? "all"} className={`rt-view ${dir}`}>
      {sub ? renderSubject(sub) : <>
        <p className="sub route-hint">{t("Choose a subject to see its lectures.")}</p>
        {spot && (() => { const rs = subjects.find((x) => x.id === spot.subjectId); return rs ? <button type="button" className="rt-resume" onClick={() => go(rs.id)}><span className="rt-resume-ico" aria-hidden="true"><TrainFront size={20} /></span>
          <span className="rt-resume-t"><small>{t("Continue where you stopped")}</small><b>{rs.name} · {spot.stop.kind === "lesson" ? t("Station {n}", { n: spot.stop.n }) : t("Quiz signal")}</b></span><ChevronRight size={18} aria-hidden="true" /></button> : null; })()}
        <div className="rt-grid">{subjects.map((s, i) => { const stops = buildStops(s), complete = stops.length > 0 && stops.every((x) => x.done);
          return <SubjectCard key={s.id} s={s} i={i} stops={stops} here={spot?.subjectId === s.id} complete={complete} active={active} onOpen={() => go(s.id)} t={t} />; })}</div></>}
    </div> : <p className="sub" style={{ padding: 14 }}>{t("Lessons are coming soon.")}</p>}
  </aside>;
}
