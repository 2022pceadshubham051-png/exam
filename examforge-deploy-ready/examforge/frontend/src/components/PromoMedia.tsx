import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { ytId, ytEmbed, ytThumb } from "../lib/youtube";

export type Promo = { id: string; mediaType: "IMAGE" | "VIDEO" | "YOUTUBE"; mediaUrl: string; linkUrl: string; newTab: boolean; showAlways: boolean };

let cache: Promise<Promo | null> | null = null;
/** The live promo, fetched once per page load and shared by the popup and the in-page ad slots. A plain fetch so it works logged-out. */
export function loadPromo(): Promise<Promo | null> {
  cache ??= fetch((((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "")) + "/api/promo/active").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return cache;
}
export function usePromo() {
  const [p, setP] = useState<Promo | null>(null);
  useEffect(() => { let off = false; void loadPromo().then((v) => !off && setP(v)); return () => { off = true; }; }, []);
  return p;
}

/** Plays a YouTube promo. `autoplay` = starts muted immediately (popup). Otherwise shows the thumbnail and loads the player on click, which keeps pages fast. */
export function YouTubeFrame({ id, autoplay, title = "Advertisement video" }: { id: string; autoplay?: boolean; title?: string }) {
  const [on, setOn] = useState(!!autoplay);
  if (on) return <div className="yt-frame"><iframe src={ytEmbed(id, autoplay ? "muted" : "click")} title={title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>;
  return <button type="button" className="yt-frame yt-poster" onClick={() => setOn(true)} aria-label={`Play video: ${title}`}>
    <img src={ytThumb(id)} alt="" loading="lazy" /><span className="yt-play"><Play size={26} fill="currentColor" aria-hidden="true" /></span></button>;
}

export function promoYtId(p: Promo) { return p.mediaType === "YOUTUBE" ? ytId(p.mediaUrl) : null; }
