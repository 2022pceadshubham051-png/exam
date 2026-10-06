import { useEffect, useState } from "react"; import { useParams, Link } from "react-router-dom"; import { api, fmt } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
const badge: Record<string, string> = { GREAT: "📈 Great Improvement", IMPROVING: "📈 You're Improving", STABLE: "➡️ Performance Stable", DROPPED: "📉 Performance Dropped", FIRST: "🆕 First Attempt" };
export default function Result() {
  const { attemptId } = useParams(); const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api(`/results/${attemptId}`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  if (err) return <p className="p-6 text-red-500">{err}</p>;
  if (!d) return <p className="p-6">Loading result…</p>;
  const r = d.result, c = d.comparison;
  const secData = Object.values(r.sectionStats as Record<string, any>).map((s, i) => ({ name: `S${i + 1}`, correct: s.correct, incorrect: s.incorrect }));
  const card = (l: string, v: string | number) => <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-semibold">{v}</div></div>;
  return <div className="mx-auto max-w-4xl space-y-6 p-4"><div className="flex justify-between"><h1 className="text-2xl font-semibold">Your Result · Attempt #{d.attemptNo}</h1><Link className="text-blue-600" to={`/review/${attemptId}`}>Review Answers →</Link></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{card("Score", `${r.score} / ${r.totalMarks}`)}{card("Percentage", `${r.percentage}%`)}{card("Accuracy", `${r.accuracy}%`)}{card("Correct / Wrong", `${r.correct} / ${r.incorrect}`)}{card("Time", fmt(r.timeTakenSec))}</div>
    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><h2 className="mb-1 font-semibold">{badge[c.status]}</h2><p>{c.message}</p>
      {c.delta && <p className="mt-2 text-sm">Score {c.delta.percentage >= 0 ? "+" : ""}{c.delta.percentage}% · Accuracy {c.delta.accuracy >= 0 ? "+" : ""}{c.delta.accuracy}pp · Wrong {c.delta.incorrect} · Unanswered {c.delta.unanswered} · Time {c.delta.timeSec <= 0 ? "-" : "+"}{fmt(Math.abs(c.delta.timeSec))}</p>}</div>
    <div className="h-64 rounded-xl bg-white dark:bg-slate-900 p-4 shadow"><ResponsiveContainer><BarChart data={secData}><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="correct" fill="#16a34a" /><Bar dataKey="incorrect" fill="#dc2626" /></BarChart></ResponsiveContainer></div></div>;
}
