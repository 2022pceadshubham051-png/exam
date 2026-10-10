import { useEffect, useState } from "react"; import Mascot from "./Mascot"; import { confetti } from "./Confetti"; import { sfx } from "../lib/game";
export const showLevelUp = (level: number, title: string) => window.dispatchEvent(new CustomEvent("ef:levelup", { detail: { level, title } }));
/** Full-screen "LEVEL UP!" celebration. */
export default function LevelUp() {
  const [d, setD] = useState<{ level: number; title: string } | null>(null);
  useEffect(() => { const on = (e: Event) => { setD((e as CustomEvent).detail); sfx("level"); setTimeout(() => confetti(150), 250); setTimeout(() => confetti(90, { x: 0.2, y: 0.5 }), 700); setTimeout(() => confetti(90, { x: 0.8, y: 0.5 }), 900); }; window.addEventListener("ef:levelup", on); return () => window.removeEventListener("ef:levelup", on); }, []);
  if (!d) return null;
  return <div className="levelup" onClick={() => setD(null)}><div className="lu-rays" /><div className="lu-card"><Mascot mood="cheer" size={150} /><div className="lu-title">LEVEL UP!</div><div className="lu-level"><span>Level</span><b>{d.level}</b></div><div className="lu-rank">You are now a <b>{d.title}</b></div><button className="btn btn-primary">Awesome!</button></div></div>;
}
