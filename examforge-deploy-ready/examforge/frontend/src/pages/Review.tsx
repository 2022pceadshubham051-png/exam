import { useEffect, useState } from "react"; import { useParams } from "react-router-dom"; import { api } from "../lib/api";
export default function Review() {
  const { attemptId } = useParams(); const [d, setD] = useState<any>(null); const [err, setErr] = useState(""); const [f, setF] = useState("all");
  useEffect(() => { api(`/attempts/${attemptId}/review`).then(setD).catch((e) => setErr(e.message)); }, [attemptId]);
  if (err) return <p className="p-6 text-red-500">{err}</p>; if (!d) return <p className="p-6">Loading review…</p>;
  const st = (r: any) => (r.selectedKey ? (r.isCorrect ? "correct" : "wrong") : "skipped");
  const txt = (r: any, k: string | null) => (k ? `${k}. ${r.options?.find((o: any) => o.key === k)?.text ?? ""}` : "—");
  const rows = d.rows.map((r: any, i: number) => ({ ...r, n: i + 1 })).filter((r: any) => f === "all" || st(r) === f);
  const col = { correct: "border-green-600", wrong: "border-red-600", skipped: "border-slate-400" } as any;
  return <div className="mx-auto max-w-3xl space-y-4 p-4"><h1 className="text-xl font-semibold">{d.testName} · Attempt #{d.attemptNo} Review</h1>
    <div className="flex gap-2">{["all", "correct", "wrong", "skipped"].map((k) => <button key={k} onClick={() => setF(k)} className={`rounded border px-3 py-1 capitalize ${f === k ? "bg-blue-600 text-white" : "border-slate-300 dark:border-slate-700"}`}>{k}</button>)}</div>
    {rows.map((r: any) => <div key={r.n} className={`rounded-xl border-l-4 bg-white dark:bg-slate-900 p-4 shadow ${col[st(r)]}`}>
      <div className="text-xs text-slate-500">Q{r.n} · {r.section}{r.topic ? ` · ${r.topic}` : ""} · {r.timeSpentSec}s</div><p className="my-2">{r.text}</p>
      <p className="text-sm">Your Answer: {txt(r, r.selectedKey)}</p><p className="text-sm">Correct Answer: {txt(r, r.correctKey)}</p>
      <p className={`text-sm font-medium ${st(r) === "correct" ? "text-green-600" : st(r) === "wrong" ? "text-red-600" : "text-slate-500"}`}>{st(r) === "correct" ? "✓ Correct" : st(r) === "wrong" ? "✗ Incorrect" : "Not Attempted"}</p>
      {r.explanation && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.explanation}</p>}</div>)}
    {!rows.length && <p className="text-slate-500">Nothing in this filter.</p>}</div>;
}
