import { useCallback, useEffect, useRef, useState } from "react"; import { useNavigate, useParams } from "react-router-dom";
import { api, fmt, type View, type Q } from "../lib/api";

type Pending = { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number };
const tClass = (s: number) => (s < 5 ? "text-red-500 timer-critical" : s <= 10 ? "text-amber-500" : "");
const pal: Record<string, string> = { ANSWERED: "bg-green-600 text-white", ANSWERED_REVIEW: "bg-purple-600 text-white", REVIEW: "bg-orange-500 text-white", NOT_ANSWERED: "bg-slate-400 text-white", VISITED: "bg-slate-400 text-white", NOT_VISITED: "bg-slate-200 dark:bg-slate-700" };

export default function Exam() {
  const { testId } = useParams(); const nav = useNavigate();
  const [v, setV] = useState<View | null>(null); const [idx, setIdx] = useState(0); const [, tick] = useState(0);
  const [sync, setSync] = useState<"saved" | "offline">("saved"); const [switches, setSwitches] = useState(0);
  const [confirm, setConfirm] = useState(false); const [drawer, setDrawer] = useState(false); const [err, setErr] = useState("");
  const ends = useRef({ test: 0, section: 0 }); const qStart = useRef(Date.now()); const local = useRef<Record<string, Q>>({});
  const qKey = `queue:${testId}`;

  const load = useCallback(async () => {
    try {
      const a = v ? await api<View>(`/attempts/${v.id}`) : await api<View>(`/tests/${testId}/start`, "POST");
      if (a.status !== "IN_PROGRESS") return nav(`/result/${a.id}`);
      ends.current = { test: Date.now() + a.remaining.test * 1000, section: Date.now() + a.remaining.section * 1000 };
      if (!v || v.sectionIdx !== a.sectionIdx) { setIdx(0); local.current = {}; }
      setV(a); qStart.current = Date.now();
    } catch (e: any) { if (e.status === 401) nav("/login"); else setErr(e.message); }
  }, [v, testId, nav]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  // Offline-safe queue: persist first, then flush in order
  const flush = useCallback(async () => {
    if (!v) return; const q: Pending[] = JSON.parse(localStorage.getItem(qKey) ?? "[]");
    while (q.length) {
      try { await api(`/attempts/${v.id}/answer`, "POST", q[0]); q.shift(); localStorage.setItem(qKey, JSON.stringify(q)); }
      catch (e: any) { if (e.status) { q.shift(); localStorage.setItem(qKey, JSON.stringify(q)); } else { setSync("offline"); return; } }
    }
    setSync("saved");
  }, [v, qKey]);
  useEffect(() => { addEventListener("online", flush); return () => removeEventListener("online", flush); }, [flush]);

  const cur = v?.questions[idx]; const q = cur && (local.current[cur.id] ?? cur);
  const save = useCallback((patch: Partial<Pending>) => {
    if (!q || !v) return; const spent = q.timeSpentMs + (Date.now() - qStart.current); qStart.current = Date.now();
    const next = { ...q, ...patch, timeSpentMs: spent } as Q; local.current[q.id] = next;
    const queue: Pending[] = JSON.parse(localStorage.getItem(qKey) ?? "[]");
    queue.push({ questionId: q.id, selectedKey: next.selectedKey, status: next.status, timeSpentMs: spent });
    localStorage.setItem(qKey, JSON.stringify(queue)); flush(); tick((n) => n + 1);
  }, [q, v, qKey, flush]);

  const go = (to: number) => { if (!v) return; save(q && q.status === "NOT_VISITED" ? { status: "VISITED" } : {}); setIdx(Math.max(0, Math.min(v.questions.length - 1, to))); };
  const finish = async () => { if (!v) return; await flush(); await api(`/attempts/${v.id}/submit`, "POST").catch(() => {}); localStorage.removeItem(qKey); nav(`/result/${v.id}`); };

  const qLimit = q?.timeLimitSec ?? null;
  const qSec = qLimit ? Math.max(0, qLimit - Math.floor((Date.now() - qStart.current + (q?.timeSpentMs ?? 0)) / 1000)) : null;
  const secSec = Math.max(0, Math.round((ends.current.section - Date.now()) / 1000)); const testSec = Math.max(0, Math.round((ends.current.test - Date.now()) / 1000));
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(i); }, []);
  // Section/test end -> flush, then server decides (advance or auto-submit)
  useEffect(() => { if (v && secSec === 0) flush().then(load); }, [secSec === 0]); // eslint-disable-line
  // Question timer end -> lock/save, auto-move next
  useEffect(() => { if (v && qSec === 0) { save({}); if (idx < v.questions.length - 1) setIdx(idx + 1); } }, [qSec === 0, idx]); // eslint-disable-line

  // Anti-cheat: deterrents only, not a guarantee
  useEffect(() => {
    if (!v) return;
    const bump = () => { if (document.visibilityState === "hidden" || !document.hasFocus()) api<any>(`/attempts/${v.id}/tab-switch`, "POST").then((r) => { setSwitches(r.tabSwitches); if (r.tabSwitches > r.max) load(); }).catch(() => {}); };
    const block = (e: Event) => e.preventDefault(); const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const evs = ["copy", "paste", "cut", "contextmenu"];
    document.addEventListener("visibilitychange", bump); addEventListener("blur", bump); addEventListener("beforeunload", warn); evs.forEach((e) => document.addEventListener(e, block));
    if (v.rules.fullscreen) document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.removeEventListener("visibilitychange", bump); removeEventListener("blur", bump); removeEventListener("beforeunload", warn); evs.forEach((e) => document.removeEventListener(e, block)); };
  }, [v?.id]); // eslint-disable-line

  if (err) return <p className="p-6 text-red-500">{err}</p>;
  if (!v || !q) return <p className="p-6">Loading exam…</p>;
  const all = v.questions.map((x) => local.current[x.id] ?? x);
  const answered = all.filter((x) => x.selectedKey).length, review = all.filter((x) => x.status.includes("REVIEW")).length;
  const Palette = <div className="grid grid-cols-5 gap-2">{all.map((x, i) => <button key={x.id} onClick={() => { go(i); setDrawer(false); }} className={`h-10 rounded text-sm ${pal[x.status] ?? pal.VISITED} ${i === idx ? "ring-2 ring-blue-500" : ""}`}>{String(i + 1).padStart(2, "0")}</button>)}</div>;
  const btn = "rounded px-4 py-2 border border-slate-300 dark:border-slate-700";

  return <div className="flex min-h-screen flex-col select-none">
    <header className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 px-4 py-2 shadow">
      <b>ExamForge</b><span>{v.sectionName} ({v.sectionIdx + 1}/{v.sectionCount})</span>
      <span className="text-sm">Test <b className={tClass(testSec)}>{fmt(testSec)}</b> · Section <b className={tClass(secSec)}>{fmt(secSec)}</b>{qSec !== null && <> · Question <b className={tClass(qSec)}>{fmt(qSec)}</b></>}</span>
      <span className="text-sm">{sync === "saved" ? "✓ Saved" : "⚠ Offline — Changes saved locally"}</span>
    </header>
    {switches > 0 && <p className="bg-amber-100 dark:bg-amber-900 px-4 py-1 text-sm">⚠️ You have switched tabs {switches} time{switches > 1 ? "s" : ""} (max {v.rules.maxTabSwitches}).</p>}
    <div className="flex flex-1">
      <main className="flex-1 p-4 md:p-8"><h2 className="mb-4 text-lg">Question {idx + 1}</h2><p className="mb-6 whitespace-pre-wrap">{q.text}</p>
        <div className="space-y-2">{q.options.map((o) => <label key={o.key} className={`flex cursor-pointer gap-3 rounded border p-3 transition ${q.selectedKey === o.key ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-slate-300 dark:border-slate-700"}`}>
          <input type="radio" checked={q.selectedKey === o.key} onChange={() => save({ selectedKey: o.key, status: q.status.includes("REVIEW") ? "ANSWERED_REVIEW" : "ANSWERED" })} /> {o.text}</label>)}</div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className={btn} onClick={() => save({ status: q.status.includes("REVIEW") ? (q.selectedKey ? "ANSWERED" : "NOT_ANSWERED") : (q.selectedKey ? "ANSWERED_REVIEW" : "REVIEW") })}>Mark for Review</button>
          <button className={btn} onClick={() => save({ selectedKey: null, status: "NOT_ANSWERED" })}>Clear Response</button>
          <button className={btn} onClick={() => go(idx - 1)}>Previous</button>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => go(idx + 1)}>Save & Next</button>
          <button className="rounded bg-green-600 px-4 py-2 text-white md:ml-auto" onClick={() => setConfirm(true)}>Submit Test</button>
          <button className={`${btn} md:hidden`} onClick={() => setDrawer(true)}>Palette</button></div></main>
      <aside className="hidden w-72 shrink-0 border-l border-slate-200 dark:border-slate-800 p-4 md:block">{Palette}</aside></div>
    {drawer && <div className="fixed inset-0 z-10 bg-black/50" onClick={() => setDrawer(false)}><div className="absolute bottom-0 w-full rounded-t-xl bg-white dark:bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>{Palette}</div></div>}
    {confirm && <div className="fixed inset-0 z-20 grid place-items-center bg-black/50"><div className="w-80 space-y-3 rounded-xl bg-white dark:bg-slate-900 p-6">
      <p className="font-semibold">Are you sure you want to submit the test?</p><p>Answered: {answered}<br />Unanswered: {all.length - answered}<br />Marked for Review: {review}</p>
      <p className="text-xs text-slate-500">Counts are for the current section.</p>
      <div className="flex justify-end gap-2"><button className={btn} onClick={() => setConfirm(false)}>Cancel</button><button className="rounded bg-green-600 px-4 py-2 text-white" onClick={finish}>Submit Test</button></div></div></div>}
  </div>;
}
