import { useEffect, useRef, useState } from "react"; import Mascot, { type Mood } from "./Mascot";
export const buddySay = (text: string, mood: Mood = "happy", ms = 2600) => window.dispatchEvent(new CustomEvent("ef:buddy", { detail: { text, mood, ms } }));
/** Forgy sits in the corner during a test, reacts to your answers and nudges you when you go quiet. */
export default function ExamBuddy() {
  const [say, setSay] = useState<{ text: string; mood: Mood } | null>(null); const [mood, setMood] = useState<Mood>("happy");
  const hide = useRef(0), idle = useRef(0);
  useEffect(() => {
    const poke = () => { clearTimeout(idle.current); idle.current = window.setTimeout(() => buddySay("Psst... pick an answer, you got this!", "think", 3200), 50000); };
    const on = (e: Event) => { const d = (e as CustomEvent).detail; setSay({ text: d.text, mood: d.mood }); setMood(d.mood); clearTimeout(hide.current); hide.current = window.setTimeout(() => { setSay(null); setMood("happy"); }, d.ms); poke(); };
    window.addEventListener("ef:buddy", on); window.addEventListener("click", poke); window.addEventListener("keydown", poke); poke();
    const hello = window.setTimeout(() => buddySay("Good luck! I'm cheering for you!", "wave", 2800), 900);
    return () => { window.removeEventListener("ef:buddy", on); window.removeEventListener("click", poke); window.removeEventListener("keydown", poke); clearTimeout(idle.current); clearTimeout(hide.current); clearTimeout(hello); };
  }, []);
  return <div className="exam-buddy" aria-live="polite">{say && <div className="buddy-bubble" key={say.text + say.mood}>{say.text}</div>}<Mascot mood={mood} size={84} /></div>;
}
