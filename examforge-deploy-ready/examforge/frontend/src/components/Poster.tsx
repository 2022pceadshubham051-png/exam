import { useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";

/** Course poster (16:9). Falls back to a coloured tile with the course initial when no image was added.
 *  The image (often a large uploaded picture) is only fetched/decoded when the card is near the screen, and a shimmer skeleton shows until it is ready. */
export default function Poster({ src, title, className = "", eager = false }: { src?: string | null; title: string; className?: string; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(eager || !src || typeof IntersectionObserver === "undefined"), [ready, setReady] = useState(false);
  useEffect(() => {
    if (near) return; const el = box.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "260px" });
    io.observe(el); return () => io.disconnect();
  }, [near]);
  useEffect(() => { setReady(false); }, [src]);
  return <div ref={box} className={`poster ${className}`} data-ready={ready || !src ? "1" : undefined} role="img" aria-label={title}>
    {src ? <>
      {!ready && <span className="poster-skel" aria-hidden="true" />}
      {near && <img src={src} alt="" decoding="async" ref={(el) => { if (el?.complete && el.naturalWidth) setReady(true); }} onLoad={() => setReady(true)} onError={() => setReady(true)} />}</>
      : <div className="poster-empty" aria-hidden="true"><GraduationCap size={34} /><b>{title.slice(0, 40)}</b></div>}
  </div>;
}
