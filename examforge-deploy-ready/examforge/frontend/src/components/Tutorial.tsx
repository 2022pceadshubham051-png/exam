import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Mascot, { type Mood } from "./Mascot"; import { sfx } from "../lib/game"; import { confetti } from "./Confetti";

export const openTutorial = () => window.dispatchEvent(new Event("ef:tutorial"));
const KEY = "ef_tutorial_done";

type Step = { mood: Mood; title: string; say: string; scene: ReactNode };
const palette = ["ans", "ans", "skip", "rev", "ans", "cur", "", "", "ans", "rev"];
const STEPS: Step[] = [
  { mood: "wave", title: "Hi, I'm Forgy!", say: "Welcome to ExamForge! I'll show you how this game works in 6 quick steps. Ready, player one?",
    scene: <div className="tu-scene tu-hello"><span style={{ "--i": 0 } as any}>📚</span><span style={{ "--i": 1 } as any}>⏱️</span><span style={{ "--i": 2 } as any}>🏆</span><span style={{ "--i": 3 } as any}>⭐</span></div> },
  { mood: "happy", title: "1. Pick a quest", say: "Every mock test is a quest. Check the difficulty badge, the timer and the number of questions, then hit Start.",
    scene: <div className="tu-scene"><div className="tu-card"><span className="pill pill-brand">SSC CGL</span><b>Mock Test 1</b><div className="tu-meta">⏱ 60 min · 📝 100 Qs</div><div className="tu-btn">Start ▶</div></div></div> },
  { mood: "think", title: "2. Choose your mode", say: "Exam mode is the real boss fight with a timer. Practice is relaxed and shows answers instantly. Adaptive picks questions for your weak spots.",
    scene: <div className="tu-scene tu-modes"><div><em>🔥</em><b>Exam</b><small>Timed</small></div><div><em>🌱</em><b>Practice</b><small>Instant check</small></div><div><em>🧠</em><b>Adaptive</b><small>Your weak spots</small></div></div> },
  { mood: "happy", title: "3. Answer and move", say: "Tap an option to answer. Use Mark for review if you are unsure. The number palette shows where you are.",
    scene: <div className="tu-scene"><div className="tu-opts"><div>A. Delhi</div><div className="sel">B. Mumbai</div><div>C. Chennai</div></div><div className="tu-pal">{palette.map((c, i) => <i key={i} className={c}>{i + 1}</i>)}</div></div> },
  { mood: "cheer", title: "4. Clear the level", say: "Submit when you are done. You get a score, 1 to 3 stars, rank and a topic-wise breakdown. Pass the test and I throw a party!",
    scene: <div className="tu-scene tu-stars"><div><span style={{ "--i": 0 } as any}>⭐</span><span style={{ "--i": 1 } as any}>⭐</span><span style={{ "--i": 2 } as any}>⭐</span></div><b>82% · Passed!</b></div> },
  { mood: "think", title: "5. Learn from mistakes", say: "Open Review to see every explanation. Then ask Smart Coach what to improve next. Mistakes are just free XP.",
    scene: <div className="tu-scene tu-review"><div className="bad">✗ Your answer: C</div><div className="good">✓ Correct: B</div><div className="tip">💡 Capital of Maharashtra is Mumbai.</div></div> },
  { mood: "cheer", title: "6. Level up!", say: "Every test earns XP. Keep a daily streak, climb the leaderboard and unlock new titles. Now go crush it!",
    scene: <div className="tu-scene tu-xp"><div className="row between"><b>Lv 3 · Challenger</b><span>🔥 4 day streak</span></div><div className="xpbar"><i style={{ width: "68%" }} /></div><small>+82 XP</small></div> },
];

export default function Tutorial() {
  const [open, setOpen] = useState(false); const [i, setI] = useState(0);
  useEffect(() => {
    const show = () => { setI(0); setOpen(true); sfx("pop"); };
    window.addEventListener("ef:tutorial", show);
    let seen = false; try { seen = localStorage.getItem(KEY) === "1"; } catch { /* ignore */ }
    const t = seen ? 0 : window.setTimeout(show, 700);
    return () => { window.removeEventListener("ef:tutorial", show); if (t) clearTimeout(t); };
  }, []);
  const close = (done: boolean) => { setOpen(false); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } if (done) { confetti(70, { x: 0.5, y: 0.5 }); sfx("win"); } };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); if (e.key === "ArrowRight") setI((n) => Math.min(STEPS.length - 1, n + 1)); if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;
  const s = STEPS[i], last = i === STEPS.length - 1;
  return <div className="modal-bg tu-bg" onClick={() => close(false)}>
    <div className="card tu" role="dialog" aria-label="ExamForge tutorial" onClick={(e) => e.stopPropagation()}>
      <button className="btn icon-btn tu-x" aria-label="Close tutorial" onClick={() => close(false)}><X size={16} /></button>
      <div className="tu-top"><Mascot key={i} mood={s.mood} size={104} /><div className="tu-bubble" key={`b${i}`}><b>{s.title}</b><p>{s.say}</p></div></div>
      <div key={`s${i}`} className="tu-stage">{s.scene}</div>
      <div className="tu-dots">{STEPS.map((_, n) => <button key={n} aria-label={`Step ${n + 1}`} className={n === i ? "on" : n < i ? "done" : ""} onClick={() => { setI(n); sfx("pop"); }} />)}</div>
      <div className="row between"><button className="btn btn-sm" onClick={() => close(false)}>Skip</button>
        <div className="row"><button className="btn btn-sm" disabled={i === 0} onClick={() => { setI(i - 1); sfx("pop"); }}><ChevronLeft size={15} />Back</button>
          <button className="btn btn-primary btn-sm" onClick={() => (last ? close(true) : (setI(i + 1), sfx("pop")))}>{last ? "Let's play!" : "Next"}{!last && <ChevronRight size={15} />}</button></div></div>
    </div></div>;
}
