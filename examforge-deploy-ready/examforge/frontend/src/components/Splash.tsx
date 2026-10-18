import { useEffect, useState } from "react";
/** One calm logo reveal per browser session (skipped for reduced motion). Uses the full logo artwork, whose white lettering is made for dark backgrounds. */
export default function Splash() {
  const [show, setShow] = useState(() => { try { return sessionStorage.getItem("ef_splash") !== "1" && !matchMedia("(prefers-reduced-motion: reduce)").matches && localStorage.getItem("ef_motion") !== "reduce"; } catch { return false; } });
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (!show) return; try { sessionStorage.setItem("ef_splash", "1"); } catch { /* ignore */ }
    const t1 = setTimeout(() => setOut(true), 1100), t2 = setTimeout(() => setShow(false), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);
  if (!show) return null;
  return <div className={`splash ${out ? "out" : ""}`} aria-hidden="true" onClick={() => setOut(true)}><img src="/brand/logo-full.png" width={1213} height={345} alt="" draggable={false} /></div>;
}
