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
    <div className="nebula" /><div className="starfield f1" /><div className="starfield f2" /><div className="planet p1"><i /></div><div className="planet p2" /><div className="shoot s1" /><div className="shoot s2" /><div className="shoot s3" />
    <svg className="rocket" width="70" height="70" viewBox="0 0 70 70"><g transform="rotate(45 35 35)"><path d="M35 6 Q50 22 48 46 L22 46 Q20 22 35 6Z" fill="#fff" stroke="#2b1b55" strokeWidth="3" /><circle cx="35" cy="28" r="6" fill="#4de2ff" stroke="#2b1b55" strokeWidth="3" /><path d="M22 38 L10 52 L22 48Z M48 38 L60 52 L48 48Z" fill="#ff5d8f" stroke="#2b1b55" strokeWidth="3" strokeLinejoin="round" /><path className="flame" d="M28 48 Q35 66 42 48Z" fill="#ffb347" stroke="#2b1b55" strokeWidth="2.5" /></g></svg>
    <div className="astro"><Mascot mood="cheer" size={84} /></div>
    <div className="hill" /><div className="walker"><div className="walker-in"><Mascot mood="happy" size={58} /></div></div>
  </div><div className="bg-fx" aria-hidden="true">{ICONS.slice(0, 8).map((c, i) => <span key={i} style={{ left: `${(i * 83) % 100}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${16 + (i % 5) * 4}s`, fontSize: 18 + (i % 4) * 8 }}>{c}</span>)}</div></>;
}
