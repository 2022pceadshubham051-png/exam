import { useEffect, useState } from "react"; import { useParams, Link, useNavigate } from "react-router-dom";
import { Eye, Target, Clock, CircleCheck, CircleX, MinusCircle, TrendingUp, TrendingDown, ArrowRight, Sparkles, LayoutDashboard, Trash2, Compass, Trophy, Share2 } from "lucide-react"; import { tr } from "../lib/i18n"; import { shareCard } from "../lib/shareCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { api, fmt } from "../lib/api"; import Shell from "../components/Shell"; import AdSlot from "../components/AdSlot";
import { ResultTicket } from "../components/ResultTicket"; import { Sparkline } from "../components/Achievement"; import { JourneyStrip } from "../components/Journey"; import { cachedProfile } from "../lib/profile"; import { ConfirmDialog, PageHeader, SkeletonResult, useCountUp, toast } from "../components/ui";
const MarksCount = ({ n }: { n: number }) => <>{useCountUp(n)}</>; import { stars, sfx } from "../lib/game";


const tone: Record<string, [string, string]> = { GREAT: ["Great improvement", "pill-ok"], IMPROVING: ["You are improving", "pill-ok"], STABLE: ["Performance stable", "pill-brand"], DROPPED: ["Performance dropped", "pill-bad"], FIRST: ["First attempt", "pill-brand"] };

export function Ring({ value, label, pass }: { value: number; label: string; pass?: boolean }) {
  const shown = useCountUp(Math.round(value));
  const r = 62, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return <div className={`ring-wrap${pass ? " pass" : ""}`}><svg width="150" height="150" viewBox="0 0 150 150"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--brand)" /><stop offset="100%" stopColor="var(--brand)" /></linearGradient></defs>
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="13" /><circle cx="75" cy="75" r={r} fill="none" stroke="url(#rg)" strokeWidth="13" strokeLinecap="round" strokeDasharray={c} transform="rotate(-90 75 75)" style={{ "--off": off, "--c": c } as any} /></svg>
    <div className="ring-v"><b>{shown}%</b><small>{label}</small></div></div>;
}

export default function Result() {
  const { attemptId } = useParams(); const nav = useNavigate(); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [askDel, setAskDel] = useState(false); const [delErr, setDelErr] = useState(""); const [delBusy, setDelBusy] = useState(false);
  useEffect(() => { api(`/results/${attemptId}`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  const remove = async () => { setDelBusy(true); setDelErr(""); try { await api(`/attempts/${attemptId}`, "DELETE"); nav("/dashboard", { replace: true }); } catch (e: any) { setDelErr(e.message); setDelBusy(false); } };
  const winPct: number | null = d?.result ? d.result.percentage : null; const winPass = winPct !== null && winPct >= (d?.passingPercent ?? 40);
  useEffect(() => { if (winPct === null) return; const t = setTimeout(() => sfx(winPass ? "win" : "pop"), 300); return () => clearTimeout(t); }, [winPct, winPass]);
  if (err) return <Shell><div className="alert alert-bad" role="alert">{err}</div></Shell>;
  if (!d) return <Shell><SkeletonResult /></Shell>;
  if (d.showResult === false) return <Shell><div className="card card-pad stack" style={{ maxWidth: 620, margin: "12vh auto" }}><h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Result is hidden</h1><p className="sub">The administrator has disabled immediate result viewing for this test. Your attempt has still been saved.</p><div><Link className="btn btn-primary" to="/dashboard"><LayoutDashboard size={16} />Back to dashboard</Link></div></div></Shell>;
  const r = d.result, c = d.comparison; const [tl, tc] = c ? (tone[c.status] ?? ["", ""]) : ["", ""];
  const passed = r.percentage >= (d.passingPercent ?? 40);
  const share = async () => { try { const how = await shareCard({ attemptId: String(attemptId), testName: d.testName ?? "", attemptNo: d.attemptNo, score: r.score, total: r.totalMarks, pct: r.percentage, passed }); if (how === "downloaded") toast("Result card saved as an image.", "ok"); } catch { toast("Could not create the card. Try again.", "bad"); } };
  const secData = Object.values(r.sectionStats as Record<string, any>).map((s: any, i) => ({ name: s.name ?? `Section ${i + 1}`, Correct: s.correct, Wrong: s.incorrect }));
  const grp = (o: Record<string, any> | null | undefined) => Object.entries(o ?? {}).map(([k, v]: [string, any]) => ({ key: k, name: v.name ?? k, ...v, total: v.correct + v.incorrect + v.unanswered, rating: Math.max(0, Math.round(v.totalMarks ? (v.score / v.totalMarks) * 100 : 0)) }));
  const subj = grp(r.subjectStats).sort((a, b) => a.rating - b.rating);
  const topics = grp(r.topicStats).filter((t) => t.name !== "Unknown").sort((a, b) => a.accuracy - b.accuracy);
  const col = (n: number) => (n >= 65 ? "var(--ok)" : n >= 40 ? "var(--warn)" : "var(--bad)");
  const stat = (I: any, l: string, v: string | number, col?: string) => <div className="stat"><div className="stat-l"><I size={14} color={col} aria-hidden="true" />{l}</div><div className="stat-v">{v}</div></div>;
  return <Shell>
    <div className="stack" style={{ gap: 22 }}>
      <div className="row between"><div><h1 className="h1">{r.percentage >= 85 ? "Excellent result" : passed ? "Test cleared" : "Result"}</h1><p className="sub" aria-label={`${stars(r.percentage)} of 3 stars`}>{"★".repeat(stars(r.percentage))}{"☆".repeat(3 - stars(r.percentage))} · Attempt #{d.attemptNo} · <span className={`pill ${d.adaptive ? "pill-ok" : d.mode === "PRACTICE" ? "pill-brand" : ""}`}>{d.adaptive ? "Adaptive practice" : d.mode === "PRACTICE" ? "Practice" : "Exam"}</span></p></div>
        <div className="row"><button type="button" className="btn" onClick={share}><Share2 size={16} />{tr("Share result")}</button><Link className="btn" to="/home"><LayoutDashboard size={16} />Home</Link><Link className="btn" to={`/exam/${d.testId}`}><ArrowRight size={16} />Retake</Link><Link className="btn btn-primary" to={`/review/${attemptId}`}><Eye size={16} />Review answers</Link><button className="btn btn-danger" onClick={() => setAskDel(true)}><Trash2 size={16} />Delete</button></div></div>
<ResultTicket attemptId={String(attemptId)} testName={d.testName ?? ""} attemptNo={d.attemptNo} score={r.score} total={r.totalMarks} pct={r.percentage} passed={passed} date={d.endedAt}><JourneyStrip value={r.percentage} goal={cachedProfile()?.targetScore ?? null} label="This attempt" arrived="You reached your goal" /></ResultTicket>
      <Sparkline testId={d.testId} />
      <section className="card card-pad row" style={{ gap: 30 }}>
        <Ring value={r.percentage} label="score" pass={passed} />
        <div style={{ flex: 1, minWidth: 220 }}><div className="stat-l">Marks obtained</div><div className="marks-big num"><MarksCount n={Math.round(r.score)} /><small>/ {r.totalMarks}</small></div>
          <div className="row" style={{ marginTop: 8, gap: 8 }}><span className={`pill ${tc}`}>{tl}</span><span className={`pill ${passed ? "pill-ok" : "pill-bad"}`}>{passed ? "Passed" : "Below passing score"}</span><span className="pill pill-warn">+{30 + Math.round(r.percentage)} XP</span></div><p className="sub" style={{ marginTop: 10, fontSize: ".92rem" }}>{c?.message ?? (d.adaptive ? "Your adaptive session was built from your previous exam performance. Use the review to see where your time and accuracy changed." : "This attempt has been saved to your history.")}</p></div></section>
      <section className="grid-stats">{stat(Target, "Accuracy", `${r.accuracy}%`)}{stat(CircleCheck, "Correct", r.correct, "var(--ok)")}{stat(CircleX, "Wrong", r.incorrect, "var(--bad)")}{stat(MinusCircle, "Skipped", r.unanswered)}{stat(Clock, "Time taken", fmt(r.timeTakenSec))}</section>
      {c?.delta && <section className="card card-pad stack" style={{ gap: 10 }}><h2 className="card-title row" style={{ gap: 8 }}><Sparkles size={18} />Compared with your last attempt</h2>
        <div className="row" style={{ gap: 8 }}>{[["Score", `${c.delta.percentage >= 0 ? "+" : ""}${c.delta.percentage}%`, c.delta.percentage >= 0], ["Accuracy", `${c.delta.accuracy >= 0 ? "+" : ""}${c.delta.accuracy} pts`, c.delta.accuracy >= 0],
          ["Wrong answers", `${c.delta.incorrect > 0 ? "+" : ""}${c.delta.incorrect}`, c.delta.incorrect <= 0], ["Skipped", `${c.delta.unanswered > 0 ? "+" : ""}${c.delta.unanswered}`, c.delta.unanswered <= 0], ["Time", `${c.delta.timeSec <= 0 ? "-" : "+"}${fmt(Math.abs(c.delta.timeSec))}`, c.delta.timeSec <= 0]]
          .map(([l, v, good]: any) => <span key={l} className={`pill ${good ? "pill-ok" : "pill-bad"}`} style={{ padding: "6px 12px" }}>{good ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{l} {v}</span>)}</div></section>}
      <section className="card card-pad stack"><h2 className="card-title">Section-wise performance</h2>
        <div style={{ height: 250 }}><ResponsiveContainer><BarChart data={secData} barGap={6}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }} cursor={{ fill: "var(--surface-2)" }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, color: "var(--muted)" }} /><Bar dataKey="Correct" fill="var(--ok)" radius={[4, 4, 0, 0]} maxBarSize={34} /><Bar dataKey="Wrong" fill="var(--bad)" radius={[4, 4, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer></div></section>
      {d.rank && d.field > 1 && <section className="card card-pad rank-card" aria-label="Your rank"><div className="row between" style={{ alignItems: "flex-end" }}><div><div className="stat-l"><Trophy size={14} aria-hidden="true" />Rank on this test</div><div className="marks-big num" style={{ fontSize: "2.2rem" }}>#{d.rank}<small>of {d.field} official attempts</small></div></div>{d.percentile !== null && <p className="sub" style={{ maxWidth: 280, textAlign: "right" }}>You scored higher than {d.percentile}% of other attempts.</p>}</div>
        {d.percentile !== null && <div className="pct-track" role="img" aria-label={`Percentile ${d.percentile} out of 100`}><i style={{ width: `${d.percentile}%` }} /><b style={{ left: `${d.percentile}%` }}>{d.percentile}</b></div>}</section>}
      {subj.length > 0 && <section className="card card-pad stack"><div><h2 className="card-title">Subject-wise rating <small className="muted" style={{ fontWeight: 500 }}>(auto-detected)</small></h2><p className="sub">Each question is classified automatically (Reasoning, Maths, English, GA, ...). Rating = marks scored out of 100 in that subject.</p></div>
        <div className="stack" style={{ gap: 12 }}>{subj.map((x: any) => <div key={x.name}><div className="row between"><b>{x.name}</b><span><b style={{ color: col(x.rating) }}>{x.rating}</b><span className="muted">/100</span> <span className="sub">· {x.correct}✓ {x.incorrect}✗ {x.unanswered}− · {x.total} Q</span></span></div><div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${Math.max(2, x.rating)}%`, background: col(x.rating) }} /></div></div>)}</div></section>}
      {topics.length > 0 && <section className="card card-pad stack"><div><h2 className="card-title">Topic-wise accuracy</h2><p className="sub">Weakest topics first.</p></div>
        <div className="card table-wrap" style={{ boxShadow: "none" }}><table className="t"><thead><tr><th>Topic</th><th>Questions</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Avg time</th></tr></thead><tbody>{topics.map((t: any) => <tr key={t.name}><td><b>{t.name}</b></td><td>{t.total}</td><td>{t.correct}</td><td>{t.incorrect}</td><td><span className={`pill ${t.accuracy >= 70 ? "pill-ok" : t.accuracy >= 40 ? "pill-warn" : "pill-bad"}`}>{t.accuracy}%</span></td><td>{t.avgTimeSec}s</td></tr>)}</tbody></table></div></section>}
      <AdSlot />
      <div className="row"><Link className="btn" to="/progress">See overall progress<ArrowRight size={16} /></Link><Link className="btn btn-primary" to="/coach"><Compass size={16} />What should I improve next?</Link></div>
      <ConfirmDialog open={askDel} danger busy={delBusy} error={delErr} title="Delete this attempt?" confirmLabel="Delete" onCancel={() => setAskDel(false)} onConfirm={remove}>The attempt, answers and result are removed from your history, progress and Smart Coach. This cannot be undone.</ConfirmDialog>
    </div></Shell>;
}
