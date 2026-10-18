import { Rocket } from "./Journey";
import { useEffect, useState } from "react"; import { Modal } from "./ui"; import { sfx } from "../lib/game";
export const showLevelUp = (level: number, title: string) => window.dispatchEvent(new CustomEvent("ef:levelup", { detail: { level, title } }));
/** Level-up notice. Calm by design: a short dialog, one soft sound (if sound is on), no confetti. */
export default function LevelUp() {
  const [d, setD] = useState<{ level: number; title: string } | null>(null);
  useEffect(() => { const on = (e: Event) => { setD((e as CustomEvent).detail); sfx("level"); }; window.addEventListener("ef:levelup", on); return () => window.removeEventListener("ef:levelup", on); }, []);
  return <Modal open={!!d} onClose={() => setD(null)} title={d ? `You reached level ${d.level}` : ""} width={380}>
    <Rocket /><p className="sub" style={{ fontSize: "1rem" }}>Your rank is now <b className="levelup-badge" style={{ color: "var(--gold-text)" }}>{d?.title}</b>. Levels come from the tests you complete and the practice you do.</p>
    <div className="modal-actions"><button className="btn btn-primary" onClick={() => setD(null)}>Continue</button></div>
  </Modal>;
}
