import { useEffect, useState } from "react"; import { useParams, Link } from "react-router-dom";
import { CircleCheck, CircleX, MinusCircle, ArrowLeft, Clock, Lightbulb, Sparkles, BookOpen } from "lucide-react";
import { Bookmark, BookmarkCheck } from "lucide-react"; import { addNote, removeNote, qKey, isSaved, ingestReview } from "../lib/notebook"; import ReportQuestion from "../components/ReportQuestion"; import DoubtButton from "../components/DoubtButton"; import { api, fmt } from "../lib/api"; import Shell from "../components/Shell"; import { SkeletonPage } from "../components/ui";

const SUBJ: Record<string, string> = { reasoning: "Reasoning", quant: "Maths / Quant", english: "English", ga: "General Awareness", science: "General Science", computer: "Computer", hindi: "Hindi", physics: "Physics", cs: "CS & IT", electronics: "Electronics" };
export default function Review() {
  const { attemptId } = useParams(); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [f, setF] = useState("all"); const [, bump] = useState(0);
  useEffect(() => { api(`/attempts/${attemptId}/review`).then((x) => { setD(x); ingestReview(x); for (const r of x.rows ?? []) if (isSaved(r.text)) addNote({ text: r.text, options: r.options ?? [], correctKey: r.correctKey, explanation: r.explanation, topic: r.topic, testName: x.testName, kind: "saved" }); }).catch((e) => setErr(e.message)); }, [attemptId]);
  if (err) return <Shell narrow><div className="alert alert-bad">{err}</div></Shell>;
  if (!d) return <Shell narrow><SkeletonPage /></Shell>;
  const st = (r: any) => (r.selectedKey ? (r.isCorrect ? "correct" : "wrong") : "skipped");
  const txt = (r: any, k: string | null) => (k ? `${k}. ${r.options?.find((o: any) => o.key === k)?.text ?? ""}` : "Not answered");
  const all = d.rows.map((r: any, i: number) => ({ ...r, n: i + 1 })); const rows = all.filter((r: any) => f === "all" || st(r) === f);
  const count = (k: string) => (k === "all" ? all.length : all.filter((r: any) => st(r) === k).length);
  const wrongTopics = [...new Set(all.filter((r: any) => st(r) === "wrong" && r.topic).map((r: any) => r.topic))].slice(0, 6) as string[];
  return <Shell narrow><div className="stack">
    <div className="row between"><div><h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}><BookOpen size={22} className="book-flip" aria-hidden="true" />{d.testName}</h1><p className="sub">Attempt #{d.attemptNo} answer review</p></div><Link className="btn" to={`/result/${attemptId}`}><ArrowLeft size={16} />Back to result</Link></div>
    {wrongTopics.length > 0 && <div className="card card-pad stack" style={{ gap: 8 }}><b>Practice the topics you got wrong</b><div className="row">{wrongTopics.map((t) => <Link key={t} className="btn btn-sm" to={`/exam/${d.testId}?mode=practice&topic=${encodeURIComponent(t)}`}><Sparkles size={14} />{t}</Link>)}</div></div>}
    <div className="seg" style={{ width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>{["all", "correct", "wrong", "skipped"].map((k) => <button key={k} onClick={() => setF(k)} className={f === k ? "on" : ""} style={{ textTransform: "capitalize" }}>{k}<span className="pill">{count(k)}</span></button>)}</div>
    {rows.map((r: any) => <article key={r.n} className={`card q-card ${st(r)}`}>
      <div className="row between"><div className="row" style={{ gap: 8 }}><span className="pill pill-brand">Q{r.n}</span><span className="pill">{r.section}</span>{r.subject && <span className="tag-chip">{SUBJ[r.subject] ?? r.subject}</span>}{r.topic && <span className="pill">{r.topic}</span>}{r.timeSpentSec > 0 && <span className={`pill ${r.avgTimeSec && r.timeSpentSec > r.avgTimeSec * 1.5 ? "pill-warn" : ""}`} title="Your time on this question, and the average of other students"><Clock size={12} aria-hidden="true" /> {fmt(r.timeSpentSec)}{r.avgTimeSec ? ` · avg ${fmt(r.avgTimeSec)}` : ""}</span>}</div>
        <button type="button" className="btn btn-sm" aria-pressed={isSaved(r.text)} onClick={() => { if (isSaved(r.text)) removeNote(qKey(r.text)); else addNote({ text: r.text, options: r.options ?? [], correctKey: r.correctKey, explanation: r.explanation, topic: r.topic, testName: d.testName, kind: "saved" }); bump((n) => n + 1); }}>{isSaved(r.text) ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}{isSaved(r.text) ? "Saved" : "Save"}</button><span className="sub row" style={{ gap: 5 }}><Clock size={14} />{r.timeSpentSec}s</span></div>
      <p style={{ fontWeight: 600, lineHeight: 1.6, margin: "12px 0 4px", whiteSpace: "pre-wrap" }}>{r.text}</p>
      <div className={`ans ${st(r) === "correct" ? "good" : st(r) === "wrong" ? "badc" : ""}`}>{st(r) === "correct" ? <CircleCheck size={18} /> : st(r) === "wrong" ? <CircleX size={18} /> : <MinusCircle size={18} />}<span><b>Your answer:</b> {txt(r, r.selectedKey)}</span></div>
      {st(r) !== "correct" && <div className="ans good"><CircleCheck size={18} /><span><b>Correct answer:</b> {txt(r, r.correctKey)}</span></div>}
      {r.explanation && <div className="ans" style={{ alignItems: "flex-start" }}><Lightbulb size={18} style={{ flex: "none" }} /><span>{r.explanation}</span></div>}
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}><ReportQuestion questionId={r.questionId} /></div>
      <DoubtButton text={r.text} options={r.options ?? []} correctKey={r.correctKey} selectedKey={r.selectedKey} explanation={r.explanation} topic={r.topic} />
    </article>)}
    {!rows.length && <div className="card empty"><p>Nothing in this filter.</p></div>}
  </div></Shell>;
}
