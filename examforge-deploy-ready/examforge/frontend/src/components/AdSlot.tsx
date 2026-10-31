import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react"; import { api } from "../lib/api"; import { usePromo, YouTubeFrame, promoYtId, type Promo } from "./PromoMedia";

// Ads are placed ONLY on Dashboard, Result, Leaderboard and the public pages. Never inside the exam screen.
// Renders nothing until VITE_ADSENSE_CLIENT and an ad slot id are configured, so there are no empty boxes before approval.
const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim();
const DEFAULT_SLOT = (import.meta.env.VITE_ADSENSE_SLOT as string | undefined)?.trim();

/** Used when AdSense is not configured: shows the admin's live promo (YouTube video, short video or photo) inline as a clearly labelled sponsored card. */
function PromoCard() {
  const p = usePromo(); const seen = useRef(false);
  useEffect(() => { if (p && !seen.current) { seen.current = true; void api(`/promo/${p.id}/view`, "POST").catch(() => {}); } }, [p]);
  if (!p || document.documentElement.classList.contains("lite")) return null;
  const yt = promoYtId(p);
  const go = (x: Promo) => { void api(`/promo/${x.id}/click`, "POST").catch(() => {}); const ext = /^https?:\/\//i.test(x.linkUrl) && new URL(x.linkUrl).origin !== location.origin; if (x.newTab || ext) window.open(x.linkUrl, "_blank", "noopener,noreferrer"); else location.href = x.linkUrl; };
  return <aside className="ad-wrap ad-promo" aria-label="Sponsored"><small>Sponsored</small>
    <div className="ad-card">
      {yt ? <YouTubeFrame id={yt} />
        : <button type="button" className="ad-media" onClick={() => go(p)} aria-label="Open offer">{p.mediaType === "VIDEO" ? <video src={p.mediaUrl} autoPlay muted loop playsInline preload="metadata" /> : <img src={p.mediaUrl} alt="Sponsored" loading="lazy" />}</button>}
      <button type="button" className="btn btn-primary btn-sm ad-cta" onClick={() => go(p)}>Learn more <ArrowUpRight size={15} aria-hidden="true" /></button>
    </div></aside>;
}

export default function AdSlot({ slot }: { slot?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const id = slot || DEFAULT_SLOT;
  useEffect(() => {
    if (!CLIENT || !id || !ref.current) return;
    if (ref.current.getAttribute("data-adsbygoogle-status")) return; // React StrictMode runs effects twice
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* ad blocker or script not loaded */ }
  }, [id]);
  if (!CLIENT || !id) return <PromoCard />;
  if (document.documentElement.classList.contains("lite")) return null;
  return <aside className="ad-wrap" aria-label="Advertisement"><small>Advertisement</small>
    <ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={id} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
