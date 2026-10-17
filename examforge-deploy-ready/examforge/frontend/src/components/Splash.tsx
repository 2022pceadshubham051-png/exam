import { useEffect, useRef, useState } from "react";
import { sfx } from "../lib/game";

/** Brief branded intro, shown once per browser tab session and easy to dismiss. */
export default function Splash() {
  const [show, setShow] = useState(() => {
    try { return sessionStorage.getItem("ef_splash") !== "1" && !matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  });
  const [out, setOut] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem("ef_splash", "1"); } catch { /* ignore */ }
    timers.current = [
      window.setTimeout(() => sfx("level"), 320),
      window.setTimeout(() => setOut(true), 1_000),
      window.setTimeout(() => setShow(false), 1_350),
    ];
    return () => timers.current.forEach(window.clearTimeout);
  }, [show]);

  const dismiss = () => {
    setOut(true);
    timers.current.forEach(window.clearTimeout);
    timers.current = [window.setTimeout(() => setShow(false), 220)];
  };

  if (!show) return null;
  return <div className={`splash ${out ? "out" : ""}`} onClick={dismiss}>
    <button type="button" className="splash-skip" onClick={(event) => { event.stopPropagation(); dismiss(); }}>Skip intro</button>
    <div className="splash-in">
      <div className="splash-logo">
        <img className="splash-full" src="/brand/logo-full.svg" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/brand/logo-full.png"; }} alt="ExamForge" draggable={false} />
        {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ "--a": `${(i / 14) * 360}deg`, "--d": `${70 + (i % 3) * 22}px` } as any} />)}
      </div>
      <h1 className="splash-name" aria-label="ExamForge" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>ExamForge</h1>
      <p>Forge your score. Level up!</p>
    </div>
  </div>;
}
