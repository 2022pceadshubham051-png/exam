import { useEffect, useState } from "react"; import { useParams, Link } from "react-router-dom";
import { CircleCheck, CircleX, MinusCircle, ArrowLeft, Clock, Lightbulb } from "lucide-react";
import { api } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

export default function Review() {
  const { attemptId } = useParams(); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [f, setF] = useState("all");
  useEffect(() => { api(`/attempts/${attemptId}/review`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  if (err) return <Shell narrow><div className="alert alert-bad">{err}</div></Shell>;
  if (!d) return <Shell narrow><Loading text="Loading your answers" /></Shell>;
  const st = (r: any) => (r.selectedKey ? (r.isCorrect ? "correct" : "wrong") : "skipped");
  const txt = (r: any, k: string | null) => (k ? `${k}. ${r.options?.find((o: any) => o.key === k)?.text ?? ""}` : "Not answered");
  const all = d.rows.map((r: any, i: number) => ({ ...r, n: i + 1 })); const rows = all.filter((r: any) => f === "all" || st(r) === f);
  const count = (k: string) => (k === "all" ? all.length : all.filter((r: any) => st(r) === k).length);
  return <Shell narrow><div className="stack">
    <div className="row between"><div><h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{d.testName}</h1><p className="sub">Attempt #{d.attemptNo} answer review</p></div><Link className="btn" to={`/result/${attemptId}`}><ArrowLeft size={16} />Back to result</Link></div>
    <div className="seg" style={{ width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>{["all", "correct", "wrong", "skipped"].map((k) => <button key={k} onClick={() => setF(k)} className={f === k ? "on" : ""} style={{ textTransform: "capitalize" }}>{k}<span className="pill">{count(k)}</span></button>)}</div>
    {rows.map((r: any) => <article key={r.n} className={`card q-card ${st(r)}`}>
      <div className="row between"><div className="row" style={{ gap: 8 }}><span className="pill pill-brand">Q{r.n}</span><span className="pill">{r.section}</span>{r.topic && <span className="pill">{r.topic}</span>}</div><span className="sub row" style={{ gap: 5 }}><Clock size={14} />{r.timeSpentSec}s</span></div>
      <p style={{ fontWeight: 600, lineHeight: 1.6, margin: "12px 0 4px", whiteSpace: "pre-wrap" }}>{r.text}</p>
      <div className={`ans ${st(r) === "correct" ? "good" : st(r) === "wrong" ? "badc" : ""}`}>{st(r) === "correct" ? <CircleCheck size={18} /> : st(r) === "wrong" ? <CircleX size={18} /> : <MinusCircle size={18} />}<span><b>Your answer:</b> {txt(r, r.selectedKey)}</span></div>
      {st(r) !== "correct" && <div className="ans good"><CircleCheck size={18} /><span><b>Correct answer:</b> {txt(r, r.correctKey)}</span></div>}
      {r.explanation && <div className="ans" style={{ alignItems: "flex-start" }}><Lightbulb size={18} style={{ flex: "none" }} /><span>{r.explanation}</span></div>}
    </article>)}
    {!rows.length && <div className="card empty"><p>Nothing in this filter.</p></div>}
  </div></Shell>;
}
