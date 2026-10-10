import { useEffect, useState } from "react"; import { useParams, Link, useNavigate } from "react-router-dom";
import { Eye, Target, Clock, CircleCheck, CircleX, MinusCircle, TrendingUp, TrendingDown, ArrowRight, Sparkles, LayoutDashboard, Trash2, Compass, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell";
import Mascot from "../components/Mascot"; import { StarBuddy, TrophyBuddy } from "../components/Buddies"; import { comicBurst } from "../components/Confetti"; import { confetti } from "../components/Confetti"; import { stars, sfx } from "../lib/game";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => { let raf = 0; const t0 = performance.now(); const tick = (t: number) => { const k = Math.min(1, (t - t0) / 1100); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, [to]);
  return <>{v}{suffix}</>;
}

const tone: Record<string, [string, string]> = { GREAT: ["Great improvement", "pill-ok"], IMPROVING: ["You are improving", "pill-ok"], STABLE: ["Performance stable", "pill-brand"], DROPPED: ["Performance dropped", "pill-bad"], FIRST: ["First attempt", "pill-brand"] };

export function Ring({ value, label }: { value: number; label: string }) {
  const r = 62, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return <div className="ring-wrap"><svg width="150" height="150" viewBox="0 0 150 150"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#c026d3" /></linearGradient></defs>
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="13" /><circle cx="75" cy="75" r={r} fill="none" stroke="url(#rg)" strokeWidth="13" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 75 75)" style={{ transition: "stroke-dashoffset .8s" }} /></svg>
    <div className="ring-v"><b>{Math.round(value)}%</b><small>{label}</small></div></div>;
}

export default function Result() {
  const { attemptId } = useParams(); const nav = useNavigate(); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [askDel, setAskDel] = useState(false); const [delErr, setDelErr] = useState(""); const [delBusy, setDelBusy] = useState(false);
  useEffect(() => { api(`/results/${attemptId}`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  const remove = async () => { setDelBusy(true); setDelErr(""); try { await api(`/attempts/${attemptId}`, "DELETE"); nav("/dashboard", { replace: true }); } catch (e: any) { setDelErr(e.message); setDelBusy(false); } };
  const winPct: number | null = d?.result ? d.result.percentage : null; const winPass = winPct !== null && winPct >= (d?.passingPercent ?? 40);
  useEffect(() => { if (winPct === null) return; const t = setTimeout(() => { if (winPass) { confetti(winPct >= 85 ? 160 : 90); comicBurst("good", winPct >= 85 ? "LEGEND!" : "CLEARED!"); sfx("win"); } else sfx("pop"); }, 450); return () => clearTimeout(t); }, [winPct, winPass]);
  if (err) return <Shell><div className="alert alert-bad">{err}</div></Shell>;
  if (!d) return <Shell><Loading text="Calculating your result" /></Shell>;
  if (d.showResult === false) return <Shell><div className="card card-pad stack" style={{ maxWidth: 620, margin: "12vh auto" }}><h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Result is hidden</h1><p className="sub">The administrator has disabled immediate result viewing for this test. Your attempt has still been saved.</p><div><Link className="btn btn-primary" to="/dashboard"><LayoutDashboard size={16} />Back to dashboard</Link></div></div></Shell>;
  const r = d.result, c = d.comparison; const [tl, tc] = c ? (tone[c.status] ?? ["", ""]) : ["", ""];
  const passed = r.percentage >= (d.passingPercent ?? 40);
  const secData = Object.values(r.sectionStats as Record<string, any>).map((s: any, i) => ({ name: s.name ?? `Section ${i + 1}`, Correct: s.correct, Wrong: s.incorrect }));
  const grp = (o: Record<string, any> | null | undefined) => Object.entries(o ?? {}).map(([k, v]: [string, any]) => ({ key: k, name: v.name ?? k, ...v, total: v.correct + v.incorrect + v.unanswered, rating: Math.max(0, Math.round(v.totalMarks ? (v.score / v.totalMarks) * 100 : 0)) }));
  const subj = grp(r.subjectStats).sort((a, b) => a.rating - b.rating);
  const topics = grp(r.topicStats).filter((t) => t.name !== "Unknown").sort((a, b) => a.accuracy - b.accuracy);
  const col = (n: number) => (n >= 80 ? "#16a34a" : n >= 65 ? "#65a30d" : n >= 50 ? "#d97706" : n >= 35 ? "#ea580c" : "#dc2626");
  const stat = (I: any, l: string, v: string | number, col?: string) => <div className="stat"><div className="stat-l"><I size={14} color={col} />{l}</div><div className="stat-v">{v}</div></div>;
  return <Shell>
    <div className="stack" style={{ gap: 22 }}>
      <div className="row between"><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Your result</h1><p className="sub">Attempt #{d.attemptNo} · <span className={`pill ${d.adaptive ? "pill-ok" : d.mode === "PRACTICE" ? "pill-brand" : ""}`}>{d.adaptive ? "Adaptive practice" : d.mode === "PRACTICE" ? "Practice" : "Exam"}</span></p></div>
        <div className="row"><Link className="btn" to="/dashboard"><LayoutDashboard size={16} />Dashboard</Link><Link className="btn" to={`/exam/${d.testId}`}><ArrowRight size={16} />Retake</Link><Link className="btn btn-primary" to={`/review/${attemptId}`}><Eye size={16} />Review answers</Link><button className="btn btn-danger" onClick={() => setAskDel(true)}><Trash2 size={16} />Delete</button></div></div>
      <section className="card card-pad result-hero">
        <div className="result-mascot"><div className="result-cast">{passed && <span className="cast-l"><StarBuddy size={64} /></span>}<Mascot mood={passed ? (r.percentage >= 85 ? "cheer" : "happy") : "sad"} size={118} />{r.percentage >= 85 ? <span className="cast-r"><TrophyBuddy size={84} /></span> : passed ? <span className="cast-r"><StarBuddy size={64} /></span> : null}</div><div className="stars">{[0, 1, 2].map((n) => <span key={n} className={n < stars(r.percentage) ? "on" : ""} style={{ "--i": n } as any}>★</span>)}</div>
          <div className="result-say">{r.percentage >= 85 ? "Legendary run!" : passed ? "Level cleared!" : "So close! Try again."}</div></div>
      </section>
      <section className="card card-pad row" style={{ gap: 30 }}>
        <Ring value={r.percentage} label="score" />
        <div style={{ flex: 1, minWidth: 220 }}><div className="stat-l">Marks obtained</div><div style={{ fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-.03em" }}><CountUp to={Math.round(r.score)} /> <span className="muted" style={{ fontSize: "1.2rem" }}>/ {r.totalMarks}</span></div>
          <div className="row" style={{ marginTop: 8, gap: 8 }}><span className={`pill ${tc}`}>{tl}</span><span className={`pill ${passed ? "pill-ok" : "pill-bad"}`}>{passed ? "Passed" : "Below passing score"}</span><span className="pill pill-warn">+{30 + Math.round(r.percentage)} XP</span></div><p className="sub" style={{ marginTop: 10, fontSize: ".92rem" }}>{c?.message ?? (d.adaptive ? "Your adaptive session was built from your previous exam performance. Use the review to see where your time and accuracy changed." : "This attempt has been saved to your history.")}</p></div></section>
      <section className="grid-stats">{stat(Target, "Accuracy", `${r.accuracy}%`)}{stat(CircleCheck, "Correct", r.correct, "#16a34a")}{stat(CircleX, "Wrong", r.incorrect, "#dc2626")}{stat(MinusCircle, "Skipped", r.unanswered)}{stat(Clock, "Time taken", fmt(r.timeTakenSec))}</section>
      {c?.delta && <section className="card card-pad stack" style={{ gap: 10 }}><h2 className="card-title row" style={{ gap: 8 }}><Sparkles size={18} />Compared with your last attempt</h2>
        <div className="row" style={{ gap: 8 }}>{[["Score", `${c.delta.percentage >= 0 ? "+" : ""}${c.delta.percentage}%`, c.delta.percentage >= 0], ["Accuracy", `${c.delta.accuracy >= 0 ? "+" : ""}${c.delta.accuracy} pts`, c.delta.accuracy >= 0],
          ["Wrong answers", `${c.delta.incorrect > 0 ? "+" : ""}${c.delta.incorrect}`, c.delta.incorrect <= 0], ["Skipped", `${c.delta.unanswered > 0 ? "+" : ""}${c.delta.unanswered}`, c.delta.unanswered <= 0], ["Time", `${c.delta.timeSec <= 0 ? "-" : "+"}${fmt(Math.abs(c.delta.timeSec))}`, c.delta.timeSec <= 0]]
          .map(([l, v, good]: any) => <span key={l} className={`pill ${good ? "pill-ok" : "pill-bad"}`} style={{ padding: "6px 12px" }}>{good ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{l} {v}</span>)}</div></section>}
      <section className="card card-pad stack"><h2 className="card-title">Section-wise performance</h2>
        <div style={{ height: 270 }}><ResponsiveContainer><BarChart data={secData} barGap={6}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} cursor={{ fill: "var(--surface-2)" }} /><Bar dataKey="Correct" fill="#16a34a" radius={[8, 8, 0, 0]} /><Bar dataKey="Wrong" fill="#dc2626" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      {d.rank && d.field > 1 && <section className="card card-pad row" style={{ gap: 14 }}><Trophy size={22} color="#d97706" /><div><b>Rank #{d.rank} of {d.field} official attempts on this test</b>{d.percentile !== null && <div className="sub">You scored higher than {d.percentile}% of other attempts.</div>}</div></section>}
      {subj.length > 0 && <section className="card card-pad stack"><div><h2 className="card-title">Subject-wise rating <small className="muted" style={{ fontWeight: 500 }}>(auto-detected)</small></h2><p className="sub">Each question is classified automatically (Reasoning, Maths, English, GA, ...). Rating = marks scored out of 100 in that subject.</p></div>
        <div className="stack" style={{ gap: 12 }}>{subj.map((x: any) => <div key={x.name}><div className="row between"><b>{x.name}</b><span><b style={{ color: col(x.rating) }}>{x.rating}</b><span className="muted">/100</span> <span className="sub">· {x.correct}✓ {x.incorrect}✗ {x.unanswered}− · {x.total} Q</span></span></div><div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${Math.max(2, x.rating)}%`, background: col(x.rating) }} /></div></div>)}</div></section>}
      {topics.length > 0 && <section className="card card-pad stack"><div><h2 className="card-title">Topic-wise accuracy</h2><p className="sub">Weakest topics first.</p></div>
        <div className="card table-wrap" style={{ boxShadow: "none" }}><table className="t"><thead><tr><th>Topic</th><th>Questions</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Avg time</th></tr></thead><tbody>{topics.map((t: any) => <tr key={t.name}><td><b>{t.name}</b></td><td>{t.total}</td><td>{t.correct}</td><td>{t.incorrect}</td><td><span className={`pill ${t.accuracy >= 70 ? "pill-ok" : t.accuracy >= 40 ? "pill-warn" : "pill-bad"}`}>{t.accuracy}%</span></td><td>{t.avgTimeSec}s</td></tr>)}</tbody></table></div></section>}
      <div className="row"><Link className="btn" to="/progress">See overall progress<ArrowRight size={16} /></Link><Link className="btn btn-primary" to="/coach"><Compass size={16} />What should I improve next?</Link></div>
      {askDel && <div className="modal-bg" onClick={() => !delBusy && setAskDel(false)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}><h3 className="card-title">Delete this attempt?</h3><p className="sub">The attempt, answers and result are removed from your history, progress and Smart Coach. This cannot be undone.</p>{delErr && <div className="alert alert-bad">{delErr}</div>}<div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={delBusy} onClick={() => setAskDel(false)}>Cancel</button><button className="btn btn-danger" disabled={delBusy} onClick={remove}><Trash2 size={15} />{delBusy ? "Deleting..." : "Delete"}</button></div></div></div>}
    </div></Shell>;
}
