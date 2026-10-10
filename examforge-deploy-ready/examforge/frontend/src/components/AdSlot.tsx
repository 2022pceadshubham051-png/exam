import { useEffect, useRef } from "react";

// Ads are placed ONLY on Dashboard, Result, Leaderboard and the public pages. Never inside the exam screen.
// Renders nothing until VITE_ADSENSE_CLIENT and an ad slot id are configured, so there are no empty boxes before approval.
const CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim();
const DEFAULT_SLOT = (import.meta.env.VITE_ADSENSE_SLOT as string | undefined)?.trim();

export default function AdSlot({ slot }: { slot?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const id = slot || DEFAULT_SLOT;
  useEffect(() => {
    if (!CLIENT || !id || !ref.current) return;
    if (ref.current.getAttribute("data-adsbygoogle-status")) return; // React StrictMode runs effects twice
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* ad blocker or script not loaded */ }
  }, [id]);
  if (!CLIENT || !id) return null;
  return <aside className="ad-wrap" aria-label="Advertisement"><small>Advertisement</small>
    <ins ref={ref} className="adsbygoogle" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={id} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
