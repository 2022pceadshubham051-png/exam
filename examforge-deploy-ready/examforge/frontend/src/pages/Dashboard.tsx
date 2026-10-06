import { useEffect, useState } from "react"; import { Link, useNavigate } from "react-router-dom"; import { api, fmt } from "../lib/api";
export default function Dashboard() {
  const nav = useNavigate(); const [tests, setTests] = useState<any[]>([]); const [hist, setHist] = useState<any[]>([]); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { Promise.all([api(`/tests?q=${encodeURIComponent(q)}`), api("/history")]).then(([t, h]) => { setTests(t); setHist(h); }).catch((e) => e.status === 401 ? nav("/login") : setErr(e.message)); }, [q]); // eslint-disable-line
  const th = "px-2 py-1 text-left font-medium";
  return <div className="mx-auto max-w-5xl space-y-6 p-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Dashboard</h1><Link className="text-blue-600" to="/progress">My Progress →</Link></div>
    {err && <p className="text-red-500">{err}</p>}
    <input className="w-full rounded border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" placeholder="Search tests" onChange={(e) => setQ(e.target.value)} />
    <div className="grid gap-3 md:grid-cols-2">{tests.map((t) => <div key={t.id} className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow">
      <div className="font-semibold">{t.name}</div><div className="text-sm text-slate-500">{t.examName} · {t.difficulty} · {fmt(t.durationSec)} · {t.sections.reduce((a: number, s: any) => a + s._count.questions, 0)} Qs</div>
      <Link className="mt-3 inline-block rounded bg-blue-600 px-3 py-1 text-white" to={`/exam/${t.id}`}>Start / Resume</Link></div>)}
      {!tests.length && <p className="text-slate-500">No tests available yet.</p>}</div>
    <h2 className="font-semibold">Test History</h2>
    {hist.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={th}>Test</th><th className={th}>#</th><th className={th}>Score</th><th className={th}>Accuracy</th><th className={th}>C/W/U</th><th className={th}>Time</th><th className={th}>Date</th><th /></tr></thead>
      <tbody>{hist.map((a) => <tr key={a.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-2 py-1">{a.test.name}</td><td>{a.attemptNo}</td><td>{a.result?.percentage}%</td><td>{a.result?.accuracy}%</td>
        <td>{a.result?.correct}/{a.result?.incorrect}/{a.result?.unanswered}</td><td>{a.result && fmt(a.result.timeTakenSec)}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td><td><Link className="text-blue-600" to={`/result/${a.id}`}>View Result</Link></td></tr>)}</tbody></table></div>
      : <p className="text-slate-500">No attempts yet — start a test above.</p>}</div>;
}
