import { useEffect, useState } from "react"; import LogoMark from "./LogoMark"; import { sfx } from "../lib/game";
/** Short game-style intro: the anvil drops, sparks fly, the name pops in. Shown once per browser session. */
export default function Splash() {
  const [show, setShow] = useState(() => { try { return sessionStorage.getItem("ef_splash") !== "1" && !matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } });
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (!show) return; try { sessionStorage.setItem("ef_splash", "1"); } catch { /* ignore */ }
    const t0 = setTimeout(() => sfx("level"), 650), t1 = setTimeout(() => setOut(true), 1900), t2 = setTimeout(() => setShow(false), 2400);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [show]);
  if (!show) return null;
  return <div className={`splash ${out ? "out" : ""}`} onClick={() => setOut(true)}>
    <div className="splash-in"><div className="splash-logo"><LogoMark size={132} animate={false} />{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ "--a": `${(i / 14) * 360}deg`, "--d": `${70 + (i % 3) * 22}px` } as any} />)}</div>
      <h1 className="splash-name">Exam<span>Forge</span></h1><p>Forge your score. Level up!</p></div></div>;
}
