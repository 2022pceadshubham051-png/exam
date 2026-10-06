import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Target, ListChecks, Trophy, Zap, Gauge, ThumbsUp, TriangleAlert, Timer, BrainCircuit, Medal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import { api, fmt } from "../lib/api";
import Shell, { Loading } from "../components/Shell";

const periods = [["last5", "Last 5"], ["last10", "Last 10"], ["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]];
const tone: Record<string, [string, string]> = { GREAT: ["Great improvement", "pill-ok"], IMPROVING: ["You are improving", "pill-ok"], STABLE: ["Performance stable", "pill-brand"], DROPPED: ["Performance dropped", "pill-bad"], FIRST: ["First attempt", "pill-brand"] };
const profileText: Record<string, string> = {
  FAST_ACCURATE: "You are fast and accurate. Keep your current pace and protect accuracy on harder questions.",
  ACCURATE_SLOW: "You are accurate but spending too long. Look for questions where your solve time can come down without sacrificing correctness.",
  FAST_INACCURATE: "You are moving too fast for your current accuracy. Slow down slightly and read the full question before answering.",
  SLOW_INACCURATE: "Both speed and accuracy need work. Start with untimed practice, then add a gentle time limit.",
  BALANCED: "Your speed and accuracy are reasonably balanced. Focus on weak topics to improve your score without giving up consistency.",
};

export default function Progress() {
  const [p, setP] = useState("all"); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { setD(null); api(`/progress?period=${p}`).then(setD).catch((e) => setErr(e.message)); }, [p]);
  const sgn = (n: number) => (n >= 0 ? "+" : "") + n;
  const stat = (I: any, l: string, v: string, delta?: number, unit = "") => <div className="stat"><div className="stat-l"><I size={14} />{l}</div><div className="stat-v">{v}</div>
    {delta !== undefined && <div className="stat-d row" style={{ gap: 4, color: delta >= 0 ? "var(--ok)" : "var(--bad)", fontWeight: 700 }}>{delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{sgn(delta)}{unit} vs previous</div>}</div>;
  const rows = (xs: any[], c: string) => xs.length ? xs.map((t) => <li key={t.topic} style={{ listStyle: "none", margin: "0 0 10px" }}><div className="row between" style={{ fontSize: ".9rem" }}><b>{t.topic}</b><span style={{ color: c, fontWeight: 800 }}>{t.accuracy}%</span></div><div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${Math.min(100, t.accuracy)}%`, background: c }} /></div><span className="sub">{t.total} questions</span></li>) : <li style={{ listStyle: "none" }} className="sub">Not enough data yet. A topic needs at least 5 questions.</li>;
  const [tl, tc] = d && !d.empty ? tone[d.comparison.status] ?? ["", ""] : ["", ""];
  const ta = d?.timeAnalytics;

  return <Shell><div className="stack" style={{ gap: 22 }}>
    <div className="row between"><div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>My progress</h1><p className="sub">See your score trend, weak areas and how efficiently you spend time.</p></div>
      <div className="seg" style={{ maxWidth: "100%", overflowX: "auto" }}>{periods.map(([k, l]) => <button key={k} onClick={() => setP(k)} className={p === k ? "on" : ""}>{l}</button>)}</div></div>
    {err && <div className="alert alert-bad">{err}</div>}
    {!d && !err ? <Loading /> : d?.empty ? <div className="card empty"><Gauge size={36} /><p>No completed exam attempts in this period yet.</p></div> : d && <>
      <section className="grid-stats">{stat(Target, "Current score", `${d.current.percentage}%`, d.change?.percentage, "%")}{stat(Gauge, "Current accuracy", `${d.current.accuracy}%`, d.change?.accuracy, " pts")}{stat(ListChecks, "Questions solved", String(d.questionsSolved))}{stat(Trophy, "Average score", `${d.avgPercentage}%`)}</section>
      <section className="card card-pad stack" style={{ gap: 8 }}><div className="row"><span className={`pill ${tc}`}>{tl}</span></div><p style={{ margin: 0 }}>{d.comparison.message}</p></section>

      <section className="card card-pad stack"><div className="row between"><div><h2 className="card-title">Performance trend</h2><p className="sub">Official exam attempts only.</p></div><span className="pill pill-brand">{d.attempts} attempts</span></div><div style={{ height: 300 }}><ResponsiveContainer><LineChart data={d.trends.score.map((s: any, i: number) => ({ attempt: s.attempt, Score: s.value, Accuracy: d.trends.accuracy[i].value, "Attempt rate": d.trends.attemptRate[i].value }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="attempt" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} /><Legend /><Line dataKey="Score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} /><Line dataKey="Accuracy" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} /><Line dataKey="Attempt rate" stroke="#c026d3" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></section>

      <section className="time-panel card card-pad stack"><div className="row between"><div><h2 className="card-title row" style={{ gap: 8 }}><Timer size={18} />Time management analytics</h2><p className="sub">How quickly you solve questions while maintaining accuracy.</p></div><span className="pill pill-brand">{ta.profile.replaceAll("_", " ")}</span></div>
        <div className="grid-stats">{stat(Timer, "Average / question", `${ta.averageSec}s`)}{stat(Gauge, "Median / question", `${ta.medianSec}s`)}{stat(Zap, "Fastest question", `${ta.fastestSec}s`)}{stat(Trophy, "Correct-answer avg", `${ta.correctAnswerAvgSec}s`)}</div>
        <div className="alert alert-info"><BrainCircuit size={16} />{profileText[ta.profile] ?? profileText.BALANCED}</div>
        <div className="grid-auto" style={{ gridTemplateColumns: "minmax(280px,1fr) minmax(280px,1fr)" }}>
          <div className="qcard"><h3 className="card-title" style={{ marginBottom: 10 }}>Time distribution</h3><div style={{ height: 230 }}><ResponsiveContainer><BarChart data={ta.distribution}><XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} /><Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          <div className="qcard"><h3 className="card-title" style={{ marginBottom: 10 }}>Time by difficulty</h3><div className="stack" style={{ gap: 10 }}>{ta.byDifficulty.map((r: any) => <div key={r.difficulty}><div className="row between"><b>{r.difficulty}</b><span className="sub">{r.questions ? `${r.avgSec}s avg · ${r.accuracy}% accuracy` : "No data"}</span></div><div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${Math.min(100, r.avgSec) }%` }} /></div></div>)}</div></div>
        </div>
        <div className="card table-wrap" style={{ boxShadow: "none" }}><table className="t"><thead><tr><th>Topic</th><th>Questions</th><th>Avg time</th><th>Accuracy</th><th>Signal</th></tr></thead><tbody>{ta.byTopic.map((r: any) => <tr key={r.topic}><td><b>{r.topic}</b></td><td>{r.questions}</td><td>{r.avgSec}s</td><td>{r.accuracy}%</td><td><span className={`pill ${r.accuracy >= 80 && r.avgSec <= 45 ? "pill-ok" : r.accuracy < 70 && r.avgSec < 35 ? "pill-bad" : r.avgSec > 60 ? "pill-warn" : "pill-brand"}`}>{r.accuracy >= 80 && r.avgSec <= 45 ? "Efficient" : r.accuracy < 70 && r.avgSec < 35 ? "Too fast" : r.avgSec > 60 ? "Slow" : "Balanced"}</span></td></tr>)}</tbody></table></div>
      </section>

      <div className="grid-auto" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        <section className="card card-pad"><h2 className="card-title row" style={{ gap: 8, marginBottom: 14 }}><ThumbsUp size={18} color="#16a34a" />Strengths</h2><ul style={{ padding: 0, margin: 0 }}>{rows(d.strong.slice(0, 5), "#16a34a")}</ul></section>
        <section className="card card-pad"><h2 className="card-title row" style={{ gap: 8, marginBottom: 14 }}><TriangleAlert size={18} color="#dc2626" />Needs work</h2><ul style={{ padding: 0, margin: 0 }}>{rows(d.weak.slice(0, 5), "#dc2626")}</ul></section></div>
      <section className="grid-stats">{stat(Trophy, "Best score", `${d.best.percentage}%`)}{stat(Target, "Best accuracy", `${d.best.accuracy}%`)}{stat(Zap, "Fastest completion", d.best.fastestSec ? fmt(d.best.fastestSec) : "-")}</section>
    </>}
  </div></Shell>;
}
