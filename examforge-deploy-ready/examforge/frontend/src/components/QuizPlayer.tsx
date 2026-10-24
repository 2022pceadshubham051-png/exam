import { useEffect, useMemo, useRef, useState } from "react"; import { ChevronLeft, ChevronRight, Check, Clock } from "lucide-react";
import { fmt } from "../lib/api"; import { useT } from "../lib/i18n"; import type { PlayQ, Answer, ReviewRow } from "../lib/engage"; import DoubtButton from "./DoubtButton";

/** One-question-at-a-time player used by the Daily Challenge and Duels. The server owns the clock; this timer is only a display and auto-submits at zero. */
export function QuizPlayer({ questions, remainingSec, onSubmit, busy }: { questions: PlayQ[]; remainingSec: number; onSubmit: (a: Answer[]) => void; busy?: boolean }) {
  const t = useT(); const [i, setI] = useState(0), [picked, setPicked] = useState<Record<string, string | null>>({}), [left, setLeft] = useState(remainingSec);
  const ms = useRef<Record<string, number>>({}), since = useRef(Date.now()), sent = useRef(false), cur = useRef(0);
  const flush = () => { const q = questions[cur.current]; if (q) ms.current[q.id] = (ms.current[q.id] ?? 0) + (Date.now() - since.current); since.current = Date.now(); };
  const go = (n: number) => { flush(); cur.current = n; setI(n); };
  const finish = () => { if (sent.current) return; sent.current = true; flush(); onSubmit(questions.map((q) => ({ questionId: q.id, selectedKey: picked[q.id] ?? null, timeMs: ms.current[q.id] ?? 0 }))); };
  const finishRef = useRef(finish); finishRef.current = finish;
  useEffect(() => { const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (left === 0) finishRef.current(); }, [left]);
  const q = questions[i], answered = useMemo(() => Object.values(picked).filter(Boolean).length, [picked]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; const idx = "abcd".indexOf(e.key.toLowerCase()); const o = idx >= 0 ? q.options.find((x) => x.key === "ABCD"[idx]) : null; if (o) setPicked((p) => ({ ...p, [q.id]: p[q.id] === o.key ? null : o.key })); else if (e.key === "ArrowRight" && i < questions.length - 1) go(i + 1); else if (e.key === "ArrowLeft" && i > 0) go(i - 1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line
  if (!q) return null;
  return <div className="stack" style={{ gap: 14 }}>
    <div className="row between"><span className="pill pill-brand">Q {i + 1} / {questions.length}</span>{q.topic && <span className="pill">{q.topic}</span>}<span className={`pill ${left <= 30 ? "pill-bad" : ""}`} role="timer" aria-label={`${t("Time left")} ${fmt(left)}`}><Clock size={13} aria-hidden="true" /> {fmt(left)}</span></div>
    <div className="eg-dots" aria-hidden="true">{questions.map((x, n) => <i key={x.id} className={`${n === i ? "now" : ""} ${picked[x.id] ? "done" : ""}`} />)}</div>
    <article className="card card-pad stack" style={{ gap: 14 }}>
      <p className="eg-q">{q.text}</p>
      <div className="stack" style={{ gap: 8 }} role="radiogroup" aria-label={t("Options")}>{q.options.map((o) => <button key={o.key} type="button" role="radio" aria-checked={picked[q.id] === o.key} className={`eg-opt ${picked[q.id] === o.key ? "on" : ""}`} onClick={() => setPicked((p) => ({ ...p, [q.id]: p[q.id] === o.key ? null : o.key }))}><b>{o.key}</b><span>{o.text}</span></button>)}</div>
    </article>
    <div className="row between">
      <button type="button" className="btn" disabled={i === 0} onClick={() => go(i - 1)}><ChevronLeft size={16} aria-hidden="true" />{t("Back")}</button>
      {i < questions.length - 1 ? <button type="button" className="btn btn-primary" onClick={() => go(i + 1)}>{t("Next")}<ChevronRight size={16} aria-hidden="true" /></button>
        : <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { if (answered === questions.length || confirm(t("{n} question(s) unanswered. Submit anyway?", { n: questions.length - answered }))) finish(); }}><Check size={16} aria-hidden="true" />{t("Submit")} ({answered}/{questions.length})</button>}
    </div>
    <p className="sub" style={{ fontSize: ".8rem" }}>{t("Keys: A–D to choose, ← → to move. Wrong answer −0.25, skip 0.")}</p>
  </div>;
}

/** Answers revealed after finishing. Every question gets the AI tutor button. */
export function QuizReview({ rows }: { rows: ReviewRow[] }) {
  const t = useT();
  return <div className="stack" style={{ gap: 12 }}>{rows.map((r, n) => <article key={r.questionId} className={`card card-pad stack q-card ${r.isCorrect ? "correct" : r.selectedKey ? "wrong" : "skipped"}`} style={{ gap: 10 }}>
    <div className="row" style={{ gap: 8 }}><span className="pill pill-brand">Q{n + 1}</span>{r.topic && <span className="pill">{r.topic}</span>}<span className={`pill ${r.isCorrect ? "pill-ok" : r.selectedKey ? "pill-bad" : ""}`}>{r.isCorrect ? t("Correct") : r.selectedKey ? t("Wrong") : t("Skipped")}</span></div>
    <p className="eg-q">{r.text}</p>
    <ul className="flash-opts">{r.options.map((o) => <li key={o.key} className={o.key === r.correctKey ? "right" : o.key === r.selectedKey ? "eg-wrong" : ""}><b>{o.key}.</b> {o.text}{o.key === r.selectedKey ? ` ← ${t("your answer")}` : ""}</li>)}</ul>
    {r.explanation && <p className="sub">{r.explanation}</p>}
    <DoubtButton text={r.text} options={r.options} correctKey={r.correctKey} selectedKey={r.selectedKey} explanation={r.explanation} topic={r.topic} />
  </article>)}</div>;
}
