import { useEffect, useState } from "react";
export default function CountUp({ to, suffix = "", ms = 1000 }: { to: number; suffix?: string; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { let raf = 0; const t0 = performance.now(); const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [to, ms]);
  return <>{v}{suffix}</>;
}
export const Wave = ({ text }: { text: string }) => { let n = 0; return <>{text.split(" ").map((w, wi) => <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap", marginRight: "0.28em" }}>{w.split("").map((c, i) => <span key={i} className="wv" style={{ animationDelay: `${(n++) * 0.04}s` }}>{c}</span>)}</span>)}</>; };
