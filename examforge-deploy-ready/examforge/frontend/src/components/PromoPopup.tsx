import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { api } from "../lib/api"; import { loadPromo, YouTubeFrame, promoYtId, type Promo } from "./PromoMedia";

// Never interrupt a running exam, and never show inside the admin screens (admin is editing the promo there).
const BLOCKED = /^\/(exam|admin)(\/|$)/;
const seenKey = (id: string) => `ef_promo_seen:${id}`;
const get = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const put = (k: string) => { try { sessionStorage.setItem(k, "1"); } catch { /* ignore */ } };

/** Full-screen promo (photo or short video) shown when the site is opened. X closes it, a click anywhere on the media goes to the promo link. */
export default function PromoPopup() {
  const { pathname } = useLocation(); const [promo, setPromo] = useState<Promo | null>(null); const [open, setOpen] = useState(false);
  const here = useRef(pathname); here.current = pathname;
  useEffect(() => {
    let t = 0; let off = false;
    // A plain fetch (not api()) so it works for logged-out visitors and a 401 never redirects to /login.
    loadPromo().then((p: Promo | null) => {
      if (off || !p || (!p.showAlways && get(seenKey(p.id)))) return;
      setPromo(p); t = window.setTimeout(() => { if (off || BLOCKED.test(here.current)) return; setOpen(true); put(seenKey(p.id)); void api(`/promo/${p.id}/view`, "POST").catch(() => {}); }, 1200);
    });
    return () => { off = true; window.clearTimeout(t); };
  }, []);
  useEffect(() => { // close if the student moves into an exam while it is open
    if (open && BLOCKED.test(pathname)) setOpen(false);
  }, [pathname, open]);
  useEffect(() => {
    if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k); const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  }, [open]);
  if (!open || !promo) return null;
  const go = () => { void api(`/promo/${promo.id}/click`, "POST").catch(() => {}); setOpen(false);
    const external = /^https?:\/\//i.test(promo.linkUrl) && new URL(promo.linkUrl).origin !== location.origin;
    if (promo.newTab || external) window.open(promo.linkUrl, "_blank", "noopener,noreferrer"); else location.href = promo.linkUrl; };
  const yt = promoYtId(promo);
  return <div className="promo-back" role="dialog" aria-modal="true" aria-label="Promotion" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
    <div className="promo-box">
      <button className="promo-x" aria-label="Close" onClick={() => setOpen(false)}><X size={20} aria-hidden="true" /></button>
      {yt ? <><div className="promo-yt"><YouTubeFrame id={yt} autoplay title="Promotion video" /></div>
          <button className="btn btn-primary promo-cta" onClick={go}>Learn more</button></>
        : <button className="promo-media" onClick={go} aria-label="Open offer">
          {promo.mediaType === "VIDEO"
            ? <video src={promo.mediaUrl} autoPlay muted loop playsInline preload="auto" />
            : <img src={promo.mediaUrl} alt="Promotion" />}
        </button>}
      <small className="promo-tag">Advertisement</small>
    </div>
  </div>;
}
