import { useEffect } from "react"; import Mascot from "./Mascot";
/** Global ambient effects: floating background, cursor sparkle trail, click bursts, cursor-tracking mascot eyes, 3D card tilt. */
const ICONS = ["⭐", "✨", "📚", "✏️", "💡", "🎯", "🏆", "🧠", "🚀", "🔥", "💎", "🎈"];
export default function FX() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement; let last = 0, raf = 0;
    const spawn = (x: number, y: number, ch: string, cls: string) => { const s = document.createElement("span"); s.className = cls; s.textContent = ch; s.style.left = x + "px"; s.style.top = y + "px"; s.style.setProperty("--dx", `${Math.random() * 60 - 30}px`); document.body.appendChild(s); setTimeout(() => s.remove(), 900); };
    const move = (e: MouseEvent) => {
      const nx = (e.clientX / innerWidth - 0.5) * 2, ny = (e.clientY / innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; root.style.setProperty("--lx", nx.toFixed(2)); root.style.setProperty("--ly", ny.toFixed(2)); });
      const now = performance.now(); if (now - last > 70) { last = now; spawn(e.clientX, e.clientY, "✦", "trail"); }
      const el = (e.target as HTMLElement | null)?.closest?.(".tcard") as HTMLElement | null;
      if (el) { const r = el.getBoundingClientRect(); el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 9}deg`); el.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 9}deg`); }
    };
    const leave = (e: MouseEvent) => { const el = (e.target as HTMLElement | null)?.closest?.(".tcard") as HTMLElement | null; if (el) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
    const click = (e: MouseEvent) => { for (let i = 0; i < 6; i++) spawn(e.clientX, e.clientY, ["✦", "★", "•"][i % 3], "clickpop"); };
    addEventListener("mousemove", move); addEventListener("mouseout", leave); addEventListener("click", click);
    return () => { removeEventListener("mousemove", move); removeEventListener("mouseout", leave); removeEventListener("click", click); };
  }, []);
  return <><div className="scene" aria-hidden="true">
    <div className="sun"><i /></div><div className="moon" /><div className="stars-bg" />
    <div className="cloud c1" /><div className="cloud c2" /><div className="cloud c3" />
    <svg className="bird" width="64" height="40" viewBox="0 0 64 40"><g className="bird-body"><ellipse cx="30" cy="22" rx="16" ry="11" fill="#ff8a3d" stroke="#2b1b55" strokeWidth="3" /><circle cx="44" cy="16" r="9" fill="#ff8a3d" stroke="#2b1b55" strokeWidth="3" /><path d="M52 15 L62 18 L52 21 Z" fill="#ffd166" stroke="#2b1b55" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="46" cy="14" r="2.2" fill="#2b1b55" /><path className="wing" d="M24 20 Q14 2 30 6 Q36 14 30 22 Z" fill="#ffb36b" stroke="#2b1b55" strokeWidth="3" /></g></svg>
    <div className="hill" /><div className="walker"><div className="walker-in"><Mascot mood="happy" size={58} /></div></div>
  </div><div className="bg-fx" aria-hidden="true">{ICONS.slice(0, 8).map((c, i) => <span key={i} style={{ left: `${(i * 83) % 100}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${16 + (i % 5) * 4}s`, fontSize: 18 + (i % 4) * 8 }}>{c}</span>)}</div></>;
}
