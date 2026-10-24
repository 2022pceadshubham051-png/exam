import { useEffect, useState } from "react";
/** One short logo reveal, only the first time this device opens the app (skipped for reduced motion). Uses the full logo artwork, whose white lettering is made for dark backgrounds. */
export default function Splash() {
  const [show, setShow] = useState(() => { try { return localStorage.getItem("ef_splash_seen") !== "1" && !matchMedia("(prefers-reduced-motion: reduce)").matches && localStorage.getItem("ef_motion") !== "reduce"; } catch { return false; } });
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (!show) return; try { localStorage.setItem("ef_splash_seen", "1"); } catch { /* ignore */ }
    const t1 = setTimeout(() => setOut(true), 700), t2 = setTimeout(() => setShow(false), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);
  if (!show) return null;
  return <div className={`splash ${out ? "out" : ""}`} aria-hidden="true" onClick={() => setOut(true)}><img src="/brand/logo-full-640.png" width={640} height={182} alt="" draggable={false} /></div>;
}
