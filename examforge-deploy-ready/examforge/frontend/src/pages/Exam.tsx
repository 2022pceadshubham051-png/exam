import { useCallback, useEffect, useRef, useState } from "react"; import { Link, useNavigate, useParams } from "react-router-dom";
import { Cloud, CloudOff, TriangleAlert, Flag, Eraser, ChevronLeft, ChevronRight, Send, LayoutGrid, X, GraduationCap } from "lucide-react";
import { api, fmt, type View, type Q } from "../lib/api";

type Pending = { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number };
const tCls = (s: number) => (s < 5 ? "crit" : s <= 10 ? "warn" : "");
const legend: [string, string][] = [["ANSWERED", "Answered"], ["ANSWERED_REVIEW", "Answered and marked"], ["REVIEW", "Marked for review"], ["NOT_ANSWERED", "Not answered"], ["NOT_VISITED", "Not visited"]];

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

  if (err) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 420, textAlign: "center" }}><div className="alert alert-bad"><TriangleAlert size={18} />{err}</div><Link className="btn" to="/dashboard">Back to dashboard</Link></div></div>;
  if (!v || !q) return <div className="grid min-h-screen place-items-center"><div className="text-center"><div className="spinner mx-auto" /><p className="sub mt-3">Preparing your exam</p></div></div>;
  const all = v.questions.map((x) => local.current[x.id] ?? x);
  const answered = all.filter((x) => x.selectedKey).length, review = all.filter((x) => x.status.includes("REVIEW")).length;
  const cnt = (st: string) => all.filter((x) => x.status === st || (st === "NOT_ANSWERED" && x.status === "VISITED")).length;
  const Palette = <div className="stack" style={{ gap: 14 }}>
    <div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>{all.map((x, i) => <button key={x.id} onClick={() => { go(i); setDrawer(false); }} className={`qb qb-${x.status} ${i === idx ? "cur" : ""}`}>{String(i + 1).padStart(2, "0")}</button>)}</div>
    <div style={{ display: "grid", gap: 7, fontSize: ".78rem" }}>{legend.map(([k, l]) => <div key={k} className="row" style={{ gap: 8, flexWrap: "nowrap" }}><span className={`dot qb qb-${k}`} style={{ height: 11, width: 11, borderRadius: 4 }} /><span className="muted">{l}</span><b style={{ marginLeft: "auto" }}>{k === "NOT_VISITED" ? all.filter((x) => x.status === "NOT_VISITED").length : cnt(k)}</b></div>)}</div>
  </div>;
  const btn = "btn";
  const pct = Math.round(((idx + 1) / all.length) * 100);

  return <div className="flex min-h-screen flex-col select-none">
    <header className="exam-top"><div className="row between" style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 18px", width: "100%" }}>
      <div className="row" style={{ gap: 12 }}><span className="logo" style={{ width: 32, height: 32 }}><GraduationCap size={17} /></span><div><b style={{ display: "block", lineHeight: 1.1 }}>{v.sectionName}</b><span className="sub">Section {v.sectionIdx + 1} of {v.sectionCount}</span></div></div>
      <div className="row" style={{ gap: 8 }}>
        <div className={`timer ${tCls(testSec)}`}><small>Test</small><b>{fmt(testSec)}</b></div>
        <div className={`timer ${tCls(secSec)}`}><small>Section</small><b>{fmt(secSec)}</b></div>
        {qSec !== null && <div className={`timer ${tCls(qSec)}`}><small>Question</small><b>{fmt(qSec)}</b></div>}</div>
      <div className="row" style={{ gap: 8 }}>
        <span className={`pill ${sync === "saved" ? "pill-ok" : "pill-warn"}`}>{sync === "saved" ? <><Cloud size={13} />Saved</> : <><CloudOff size={13} />Offline, saved on device</>}</span>
        <button className="btn btn-ok btn-sm" onClick={() => setConfirm(true)}><Send size={14} />Submit</button></div>
    </div></header>
    {switches > 0 && <div className="alert alert-warn" style={{ borderRadius: 0 }}><TriangleAlert size={17} />You switched tabs {switches} time{switches > 1 ? "s" : ""}. The test auto-submits after {v.rules.maxTabSwitches}.</div>}
    <div className="flex flex-1" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}>
      <main className="flex-1" style={{ padding: "22px 18px 28px", minWidth: 0 }}>
        <div className="row between" style={{ marginBottom: 10 }}><span className="pill pill-brand">Question {idx + 1} of {all.length}</span><span className="sub">{answered} answered, {review} marked</span></div>
        <div className="bar" style={{ marginBottom: 18 }}><i style={{ width: `${pct}%` }} /></div>
        <div className="card card-pad fade-in" key={q.id}>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.65, fontWeight: 600, whiteSpace: "pre-wrap", margin: "0 0 20px" }}>{q.text}</p>
          <div className="stack" style={{ gap: 10 }}>{q.options.map((o) => <label key={o.key} className={`opt ${q.selectedKey === o.key ? "sel" : ""}`}>
            <input className="sr" type="radio" name="opt" checked={q.selectedKey === o.key} onChange={() => save({ selectedKey: o.key, status: q.status.includes("REVIEW") ? "ANSWERED_REVIEW" : "ANSWERED" })} />
            <span className="opt-k">{o.key}</span><span style={{ flex: 1 }}>{o.text}</span></label>)}</div></div>
        <div className="action-bar">
          <button className={btn} onClick={() => save({ status: q.status.includes("REVIEW") ? (q.selectedKey ? "ANSWERED" : "NOT_ANSWERED") : (q.selectedKey ? "ANSWERED_REVIEW" : "REVIEW") })}><Flag size={15} />{q.status.includes("REVIEW") ? "Unmark" : "Mark for review"}</button>
          <button className={btn} onClick={() => save({ selectedKey: null, status: "NOT_ANSWERED" })}><Eraser size={15} />Clear</button>
          <button className={`${btn} md:hidden`} onClick={() => setDrawer(true)}><LayoutGrid size={15} />Palette</button>
          <span style={{ flex: 1 }} />
          <button className={btn} onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} />Previous</button>
          <button className="btn btn-primary" onClick={() => go(idx + 1)}>Save and next<ChevronRight size={16} /></button></div>
      </main>
      <aside className="hidden md:block" style={{ width: 290, flex: "none", padding: "22px 18px 18px 0" }}><div className="card card-pad" style={{ position: "sticky", top: 84 }}><h3 className="card-title" style={{ marginBottom: 14 }}>Question palette</h3>{Palette}</div></aside></div>
    {drawer && <div className="modal-bg" style={{ alignItems: "end", padding: 0 }} onClick={() => setDrawer(false)}><div className="card card-pad" style={{ width: "100%", borderRadius: "22px 22px 0 0" }} onClick={(e) => e.stopPropagation()}>
      <div className="row between" style={{ marginBottom: 12 }}><h3 className="card-title">Question palette</h3><button className="btn icon-btn" onClick={() => setDrawer(false)}><X size={17} /></button></div>{Palette}</div></div>}
    {confirm && <div className="modal-bg" onClick={() => setConfirm(false)}><div className="card modal stack" style={{ gap: 14 }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title" style={{ fontSize: "1.2rem" }}>Submit the test?</h3>
      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{answered}</div><div className="stat-d">Answered</div></div>
        <div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{all.length - answered}</div><div className="stat-d">Unanswered</div></div>
        <div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{review}</div><div className="stat-d">Marked</div></div></div>
      <p className="sub">Counts are for the current section. You cannot change answers after submitting.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setConfirm(false)}>Keep working</button><button className="btn btn-ok" onClick={finish}>Submit test</button></div></div></div>}
  </div>;
}
