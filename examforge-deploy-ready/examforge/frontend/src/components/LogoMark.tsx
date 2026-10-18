import { useState } from "react";

/* Brand artwork lives in /public/brand (served at /brand/*). Vite only serves files from /public by URL; the SVGs in /branding
   are PNG-wrapped masters kept as source and are NOT served. The mark PNGs are rendered at the nearest sharp size (1x/2x). */
const SIZES = [32, 64, 192, 512] as const;
const pick = (px: number) => SIZES.find((s) => s >= px) ?? 512;

/** Symbol-only logo (graduation cap, E, book, sparkles). Square, never stretched; falls back to a simple monogram if the image fails. */
export default function LogoMark({ size = 34, className = "", alt = "ExamForge" }: { size?: number; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={`logo-fallback ${className}`} role={alt ? "img" : undefined} aria-label={alt || undefined} style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}>E</span>;
  const a = pick(size), b = pick(size * 2);
  return <img className={`logo-mark ${className}`} src={`/brand/logo-mark-${a}.png`} srcSet={`/brand/logo-mark-${a}.png 1x, /brand/logo-mark-${b}.png 2x`} width={size} height={size} alt={alt} decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** Mark + live wordmark. The wordmark is real text (violet/ink + gold) so it stays crisp and readable in light, dark and Astra. */
export function BrandLockup({ size = 34, tagline = false, onDark = false }: { size?: number; tagline?: boolean; onDark?: boolean }) {
  return <span className={`brand-lockup ${onDark ? "on-dark" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <LogoMark size={size} alt="" />
    <span><span className="wordmark"><span className="wm-exam">Exam</span><span className="wm-forge">Forge</span></span>{tagline && <small className="brand-tag">Prepare · Practice · Progress</small>}</span>
  </span>;
}
