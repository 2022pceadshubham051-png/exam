import { useEffect, useState } from "react"; import { api, fmt } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
const periods = [["last5", "Last 5"], ["last10", "Last 10"], ["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]];
const badge: Record<string, string> = { GREAT: "📈 Great Improvement", IMPROVING: "📈 You're Improving", STABLE: "➡️ Performance Stable", DROPPED: "📉 Performance Dropped", FIRST: "🆕 First Attempt" };
export default function Progress() {
  const [p, setP] = useState("all"); const [d, setD] = useState<any>(null);
  useEffect(() => { api(`/progress?period=${p}`).then(setD); }, [p]);
  const sgn = (n: number) => (n >= 0 ? "+" : "") + n;
  const card = (l: string, v: string) => <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-semibold">{v}</div></div>;
  const rows = (xs: any[], c: string) => xs.length ? xs.map((t) => <li key={t.topic} className={c}>{t.topic} — {t.accuracy}% <span className="text-xs text-slate-500">({t.total} Qs)</span></li>) : <li className="text-slate-500">Not enough data yet (needs 5+ questions per topic)</li>;
  return <div className="mx-auto max-w-5xl space-y-6 p-4"><h1 className="text-2xl font-semibold">My Progress</h1>
    <div className="flex flex-wrap gap-2">{periods.map(([k, l]) => <button key={k} onClick={() => setP(k)} className={`rounded border px-3 py-1 ${p === k ? "bg-blue-600 text-white" : "border-slate-300 dark:border-slate-700"}`}>{l}</button>)}</div>
    {!d ? <p>Loading…</p> : d.empty ? <p className="text-slate-500">No completed attempts in this period.</p> : <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{card("Current Score", `${d.current.percentage}%`)}{card("Score Change", d.change ? sgn(d.change.percentage) + "%" : "—")}{card("Current Accuracy", `${d.current.accuracy}%`)}{card("Accuracy Change", d.change ? sgn(d.change.accuracy) + "pp" : "—")}{card("Questions Solved", String(d.questionsSolved))}</div>
      <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><b>{badge[d.comparison.status]}</b><p>{d.comparison.message}</p></div>
      <div className="h-72 rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><ResponsiveContainer><LineChart data={d.trends.score.map((s: any, i: number) => ({ attempt: s.attempt, Score: s.value, Accuracy: d.trends.accuracy[i].value, "Attempt rate": d.trends.attemptRate[i].value }))}>
        <XAxis dataKey="attempt" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line dataKey="Score" stroke="#2563eb" /><Line dataKey="Accuracy" stroke="#16a34a" /><Line dataKey="Attempt rate" stroke="#9333ea" /></LineChart></ResponsiveContainer></div>
      <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><h2 className="mb-2 font-semibold">Strengths</h2><ul>{rows(d.strong.slice(0, 5), "text-green-600")}</ul></div>
        <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><h2 className="mb-2 font-semibold">Weak Areas</h2><ul>{rows(d.weak.slice(0, 5), "text-red-500")}</ul></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{card("🏆 Best Score", `${d.best.percentage}%`)}{card("🎯 Best Accuracy", `${d.best.accuracy}%`)}{card("⚡ Fastest Complete", d.best.fastestSec ? fmt(d.best.fastestSec) : "—")}{card("Avg Score", `${d.avgPercentage}%`)}</div></>}</div>;
}
