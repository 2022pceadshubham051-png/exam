import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./ui";

export const openTutorial = () => window.dispatchEvent(new Event("ef:tutorial"));
const KEY = "ef_tutorial_done";

const STEPS = [
  { t: "Welcome to ExamForge", d: "A short tour of how a test works, from picking one to reading your analysis. It takes about a minute." },
  { t: "1. Start from Home", d: "Home shows today's test, your weak topics and your streak. Practice has every test, grouped by exam, with your target exam first." },
  { t: "2. Choose a mode", d: "Exam mode is timed and counts on the leaderboard. Practice is untimed and shows the answer after each question. Smart practice picks questions from your weaker topics." },
  { t: "3. Answer and navigate", d: "Choose an option, or press A–D. Mark a question for review if you are unsure, and use the question palette to jump around. Answers save automatically." },
  { t: "4. Submit and review", d: "You get your score, accuracy, section and topic breakdown, and an answer review with explanations." },
  { t: "5. Decide what to practise next", d: "Your wrong answers go to the Mistake notebook and come back after 1, 3, 7, 14 and 30 days. Smart Coach ranks the topics that will add the most marks." },
];

export default function Tutorial() {
  const [open, setOpen] = useState(false); const [i, setI] = useState(0);
  useEffect(() => {
    const show = () => { setI(0); setOpen(true); };
    window.addEventListener("ef:tutorial", show);
    let seen = false; try { seen = localStorage.getItem(KEY) === "1"; } catch { /* ignore */ }
    const t = seen ? 0 : window.setTimeout(show, 700);
    return () => { window.removeEventListener("ef:tutorial", show); if (t) clearTimeout(t); };
  }, []);
  const close = () => { setOpen(false); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setI((n) => Math.min(STEPS.length - 1, n + 1)); if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open]);
  const s = STEPS[i], last = i === STEPS.length - 1;
  return <Modal open={open} onClose={close} title="ExamForge quick tour" width={520}>
    <div className="tour-step" aria-live="polite"><span className="eyebrow">Step {i + 1} of {STEPS.length}</span><h3 style={{ fontSize: "1.2rem" }}>{s.t}</h3><p className="sub" style={{ fontSize: "1rem" }}>{s.d}</p></div>
    <div className="tour-dots">{STEPS.map((_, n) => <button key={n} aria-label={`Go to step ${n + 1}`} aria-current={n === i ? "step" : undefined} className={n === i ? "on" : n < i ? "done" : ""} onClick={() => setI(n)} />)}</div>
    <div className="row between"><button className="btn btn-ghost" onClick={close}>Skip tour</button>
      <div className="row"><button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft size={15} />Back</button>
        <button className="btn btn-primary" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Start practising" : "Next"}{!last && <ChevronRight size={15} />}</button></div></div>
  </Modal>;
}
