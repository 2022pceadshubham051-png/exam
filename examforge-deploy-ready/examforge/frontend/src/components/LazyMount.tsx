import { useEffect, useRef, useState, type ReactNode } from "react";

/** Draws its children only when it is about to scroll into view (and keeps them afterwards). Until then it shows a shimmer skeleton of the same size, so the page does not jump.
 *  Used for the heavy SVG maps. */
export default function LazyMount({ children, ratio, className = "", rootMargin = "360px", onShow, skeleton = "map" }: { children: ReactNode; ratio?: number; className?: string; rootMargin?: string; onShow?: () => void; skeleton?: "map" | "box" }) {
  const box = useRef<HTMLDivElement>(null), cb = useRef(onShow); cb.current = onShow;
  const [on, setOn] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (on) return; const el = box.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin });
    io.observe(el); return () => io.disconnect();
  }, [on, rootMargin]);
  useEffect(() => { if (on) cb.current?.(); }, [on]);
  return <div ref={box} className={className} style={ratio ? { aspectRatio: String(ratio) } : undefined}>{on ? children : <div className={`lazy-skel ${skeleton}`} aria-hidden="true"><i /><i /><i /></div>}</div>;
}
