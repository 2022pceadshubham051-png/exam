import { useState } from "react"; import { api } from "../lib/api";
const box = "rounded-xl bg-white dark:bg-slate-900 p-4 shadow space-y-2"; const inp = "w-full rounded border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2";
export default function Admin() {
  const [t, setT] = useState({ name: "", examName: "", minutes: 120, negativeMarks: 0.25, sections: "Computer Awareness,20\nDBMS,25" }); const [test, setTest] = useState<any>(null);
  const [text, setText] = useState(""); const [items, setItems] = useState<any[]>([]); const [sid, setSid] = useState(""); const [msg, setMsg] = useState("");
  const run = (fn: () => Promise<any>) => fn().catch((e) => setMsg("❌ " + e.message));
  const create = () => run(async () => {
    const sections = t.sections.split("\n").filter(Boolean).map((l) => { const [name, m] = l.split(","); return { name: name.trim(), durationSec: Math.round(+m * 60) }; });
    const r = await api("/tests", "POST", { name: t.name, examName: t.examName, durationSec: t.minutes * 60, negativeMarks: +t.negativeMarks, sections }); setTest(r); setSid(r.sections[0].id); setMsg("Test created — import questions next."); });
  const preview = () => run(async () => setItems(await api("/questions/import/preview", "POST", { text })));
  const fix = (i: number, key: string) => setItems(items.map((q, j) => j === i ? { ...q, correctKey: key, errors: q.errors.filter((e: string) => !e.includes("Answer Detection") && !e.includes("does not exist")) } : q));
  const ok = (q: any) => q.errors.length === 0 && q.correctKey;
  const approve = () => run(async () => { const r = await api("/questions/import", "POST", { sectionId: sid || undefined, items: items.filter(ok) }); setMsg(`Imported ${r.created} (pending review), rejected ${r.rejected}.`); setItems(items.filter((q) => !ok(q))); });
  const publish = () => run(async () => { const r = await api("/questions/verify", "POST", { testId: test.id }); setMsg(`Verified ${r.count} questions of this test. You can publish now.`); });
  return <div className="mx-auto max-w-4xl space-y-4 p-4"><h1 className="text-2xl font-semibold">Test Builder</h1>{msg && <p className="text-sm">{msg}</p>}
    <div className={box}><h2 className="font-semibold">1. Create test</h2><input className={inp} placeholder="Test name" onChange={(e) => setT({ ...t, name: e.target.value })} /><input className={inp} placeholder="Exam name" onChange={(e) => setT({ ...t, examName: e.target.value })} />
      <div className="flex gap-2"><input className={inp} type="number" value={t.minutes} onChange={(e) => setT({ ...t, minutes: +e.target.value })} /><input className={inp} type="number" step="0.05" value={t.negativeMarks} onChange={(e) => setT({ ...t, negativeMarks: +e.target.value })} /></div>
      <textarea className={inp} rows={3} value={t.sections} onChange={(e) => setT({ ...t, sections: e.target.value })} /><p className="text-xs text-slate-500">Sections: name,minutes per line. Duration · negative marks above.</p>
      <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={create}>Create</button>{test && <p className="text-xs">Test ID: {test.id}</p>}</div>
    <div className={box}><h2 className="font-semibold">2. Import AI questions</h2>
      {test && <select className={inp} value={sid} onChange={(e) => setSid(e.target.value)}>{test.sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
      <textarea className={inp} rows={10} placeholder="Paste AI-generated questions here…" onChange={(e) => setText(e.target.value)} /><button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={preview}>Parse & Preview</button>
      {items.map((q, i) => <div key={i} className={`rounded border p-2 text-sm ${ok(q) ? "border-green-600" : "border-red-500"}`}><b>Q{q.index}.</b> {q.text}
        {q.options.map((o: any) => <div key={o.key} className={q.correctKey === o.key ? "font-semibold text-green-600" : ""}>{o.key}. {o.text}</div>)}
        {q.errors.map((e: string) => <div key={e} className="text-red-500">❌ {e}</div>)}
        {!q.correctKey && q.options.length > 0 && <div>Pick answer: {q.options.map((o: any) => <button key={o.key} className="mr-1 rounded border px-2" onClick={() => fix(i, o.key)}>{o.key}</button>)}</div>}</div>)}
      {items.some(ok) && <button className="rounded bg-green-600 px-4 py-2 text-white" onClick={approve}>Approve {items.filter(ok).length} valid</button>}</div>
    <div className={box}><h2 className="font-semibold">3. Verify & publish</h2><button className="rounded border px-4 py-2" onClick={publish}>Verify all pending</button>
      {test && <button className="ml-2 rounded bg-green-600 px-4 py-2 text-white" onClick={() => run(async () => { await api(`/tests/${test.id}/publish`, "POST"); setMsg("✅ Published"); })}>Publish test</button>}</div></div>;
}
