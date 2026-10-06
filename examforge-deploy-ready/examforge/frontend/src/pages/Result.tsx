import { useEffect, useState } from "react"; import { useParams, Link } from "react-router-dom";
import { Eye, Target, Clock, CircleCheck, CircleX, MinusCircle, TrendingUp, TrendingDown, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

const tone: Record<string, [string, string]> = { GREAT: ["Great improvement", "pill-ok"], IMPROVING: ["You are improving", "pill-ok"], STABLE: ["Performance stable", "pill-brand"], DROPPED: ["Performance dropped", "pill-bad"], FIRST: ["First attempt", "pill-brand"] };

export function Ring({ value, label }: { value: number; label: string }) {
  const r = 62, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return <div className="ring-wrap"><svg width="150" height="150" viewBox="0 0 150 150"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#c026d3" /></linearGradient></defs>
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="13" /><circle cx="75" cy="75" r={r} fill="none" stroke="url(#rg)" strokeWidth="13" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 75 75)" style={{ transition: "stroke-dashoffset .8s" }} /></svg>
    <div className="ring-v"><b>{Math.round(value)}%</b><small>{label}</small></div></div>;
}

export default function Result() {
  const { attemptId } = useParams(); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/results/${attemptId}`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  if (err) return <Shell><div className="alert alert-bad">{err}</div></Shell>;
  if (!d) return <Shell><Loading text="Calculating your result" /></Shell>;
  if (d.showResult === false) return <Shell><div className="card card-pad stack" style={{ maxWidth: 620, margin: "12vh auto" }}><h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Result is hidden</h1><p className="sub">The administrator has disabled immediate result viewing for this test. Your attempt has still been saved.</p><div><Link className="btn btn-primary" to="/dashboard"><LayoutDashboard size={16} />Back to dashboard</Link></div></div></Shell>;
  const r = d.result, c = d.comparison; const [tl, tc] = c ? (tone[c.status] ?? ["", ""]) : ["", ""];
  const passed = r.percentage >= (d.passingPercent ?? 40);
  const secData = Object.values(r.sectionStats as Record<string, any>).map((s: any, i) => ({ name: s.name ?? `Section ${i + 1}`, Correct: s.correct, Wrong: s.incorrect }));
  const stat = (I: any, l: string, v: string | number, col?: string) => <div className="stat"><div className="stat-l"><I size={14} color={col} />{l}</div><div className="stat-v">{v}</div></div>;
  return <Shell>
    <div className="stack" style={{ gap: 22 }}>
      <div className="row between"><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Your result</h1><p className="sub">Attempt #{d.attemptNo} · <span className="pill">{d.mode === "PRACTICE" ? "Practice" : "Exam"}</span></p></div>
        <div className="row"><Link className="btn" to="/dashboard"><LayoutDashboard size={16} />Dashboard</Link><Link className="btn" to={`/exam/${d.testId}`}><ArrowRight size={16} />Retake</Link><Link className="btn btn-primary" to={`/review/${attemptId}`}><Eye size={16} />Review answers</Link></div></div>
      <section className="card card-pad row" style={{ gap: 30 }}>
        <Ring value={r.percentage} label="score" />
        <div style={{ flex: 1, minWidth: 220 }}><div className="stat-l">Marks obtained</div><div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-.03em" }}>{r.score} <span className="muted" style={{ fontSize: "1.2rem" }}>/ {r.totalMarks}</span></div>
          <div className="row" style={{ marginTop: 8, gap: 8 }}><span className={`pill ${tc}`}>{tl}</span><span className={`pill ${passed ? "pill-ok" : "pill-bad"}`}>{passed ? "Passed" : "Below passing score"}</span></div><p className="sub" style={{ marginTop: 10, fontSize: ".92rem" }}>{c.message}</p></div></section>
      <section className="grid-stats">{stat(Target, "Accuracy", `${r.accuracy}%`)}{stat(CircleCheck, "Correct", r.correct, "#16a34a")}{stat(CircleX, "Wrong", r.incorrect, "#dc2626")}{stat(MinusCircle, "Skipped", r.unanswered)}{stat(Clock, "Time taken", fmt(r.timeTakenSec))}</section>
      {c?.delta && <section className="card card-pad stack" style={{ gap: 10 }}><h2 className="card-title row" style={{ gap: 8 }}><Sparkles size={18} />Compared with your last attempt</h2>
        <div className="row" style={{ gap: 8 }}>{[["Score", `${c.delta.percentage >= 0 ? "+" : ""}${c.delta.percentage}%`, c.delta.percentage >= 0], ["Accuracy", `${c.delta.accuracy >= 0 ? "+" : ""}${c.delta.accuracy} pts`, c.delta.accuracy >= 0],
          ["Wrong answers", `${c.delta.incorrect > 0 ? "+" : ""}${c.delta.incorrect}`, c.delta.incorrect <= 0], ["Skipped", `${c.delta.unanswered > 0 ? "+" : ""}${c.delta.unanswered}`, c.delta.unanswered <= 0], ["Time", `${c.delta.timeSec <= 0 ? "-" : "+"}${fmt(Math.abs(c.delta.timeSec))}`, c.delta.timeSec <= 0]]
          .map(([l, v, good]: any) => <span key={l} className={`pill ${good ? "pill-ok" : "pill-bad"}`} style={{ padding: "6px 12px" }}>{good ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{l} {v}</span>)}</div></section>}
      <section className="card card-pad stack"><h2 className="card-title">Section-wise performance</h2>
        <div style={{ height: 270 }}><ResponsiveContainer><BarChart data={secData} barGap={6}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} cursor={{ fill: "var(--surface-2)" }} /><Bar dataKey="Correct" fill="#16a34a" radius={[8, 8, 0, 0]} /><Bar dataKey="Wrong" fill="#dc2626" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <div><Link className="btn" to="/progress">See overall progress<ArrowRight size={16} /></Link></div>
    </div></Shell>;
}
