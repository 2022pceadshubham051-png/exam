import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Cloud, CloudOff, TriangleAlert, Flag, Eraser, ChevronLeft, ChevronRight, Send,
  LayoutGrid, X, GraduationCap, Clock3, Sparkles, ShieldCheck, RotateCcw, Play,
} from "lucide-react";
import { api, fmt, type View, type Q } from "../lib/api";

type Pending = { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number };
const tCls = (s: number) => (s < 5 ? "crit" : s <= 10 ? "warn" : "");
const legend: [string, string][] = [["ANSWERED", "Answered"], ["ANSWERED_REVIEW", "Answered + marked"], ["REVIEW", "Marked for review"], ["NOT_ANSWERED", "Not answered"], ["NOT_VISITED", "Not visited"]];

type TestMeta = any;

export default function Exam() {
  const { testId } = useParams(); const nav = useNavigate();
  const [meta, setMeta] = useState<TestMeta | null>(null);
  const [v, setV] = useState<View | null>(null);
  const [idx, setIdx] = useState(0); const [, tick] = useState(0);
  const [sync, setSync] = useState<"saved" | "offline">("saved"); const [switches, setSwitches] = useState(0);
  const [confirm, setConfirm] = useState(false); const [drawer, setDrawer] = useState(false); const [err, setErr] = useState("");
  const [modeChoice, setModeChoice] = useState<"EXAM" | "PRACTICE">("EXAM"); const [starting, setStarting] = useState(false);
  const ends = useRef({ test: 0, section: 0 }); const qStart = useRef(Date.now()); const local = useRef<Record<string, Q>>({});
  const qKey = `queue:${testId}`;

  useEffect(() => {
    api(`/tests/${testId}`).then((t) => {
      setMeta(t);
      if (t.activeAttempt) setModeChoice(t.activeAttempt.mode);
      else if (t.allowPracticeMode === false) setModeChoice("EXAM");
    }).catch((e: any) => setErr(e.message));
  }, [testId]);

  const load = useCallback(async (attemptId?: string) => {
    try {
      const a = attemptId ? await api<View>(`/attempts/${attemptId}`) : await api<View>(`/tests/${testId}/start`, "POST", { mode: modeChoice });
      if (a.status !== "IN_PROGRESS") return nav(`/result/${a.id}`);
      ends.current = { test: a.remaining.test > -1 ? Date.now() + a.remaining.test * 1000 : 0, section: a.remaining.section > -1 ? Date.now() + a.remaining.section * 1000 : 0 };
      if (!v || v.sectionIdx !== a.sectionIdx || v.id !== a.id) { setIdx(0); local.current = {}; }
      setV(a); qStart.current = Date.now();
    } catch (e: any) { if (e.status === 401) nav("/login"); else setErr(e.message); }
  }, [modeChoice, nav, testId, v]);

  const start = async (mode: "EXAM" | "PRACTICE") => {
    setStarting(true); setErr(""); setModeChoice(mode);
    try {
      const a = await api<View>(`/tests/${testId}/start`, "POST", { mode });
      setV(a); ends.current = { test: a.remaining.test > -1 ? Date.now() + a.remaining.test * 1000 : 0, section: a.remaining.section > -1 ? Date.now() + a.remaining.section * 1000 : 0 }; setIdx(0); local.current = {}; qStart.current = Date.now();
    } catch (e: any) { setErr(e.message); } finally { setStarting(false); }
  };

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

  const go = (to: number) => { if (!v) return; if (to === idx) return; save(q && q.status === "NOT_VISITED" ? { status: "VISITED" } : {}); setIdx(Math.max(0, Math.min(v.questions.length - 1, to))); };
  const finish = async () => { if (!v) return; await flush(); await api(`/attempts/${v.id}/submit`, "POST").catch(() => {}); localStorage.removeItem(qKey); nav(`/result/${v.id}`); };

  const timed = v?.mode !== "PRACTICE";
  const qLimit = timed ? q?.timeLimitSec ?? null : null;
  const qSec = qLimit ? Math.max(0, qLimit - Math.floor((Date.now() - qStart.current + (q?.timeSpentMs ?? 0)) / 1000)) : null;
  const secSec = timed && ends.current.section ? Math.max(0, Math.round((ends.current.section - Date.now()) / 1000)) : -1;
  const testSec = timed && ends.current.test ? Math.max(0, Math.round((ends.current.test - Date.now()) / 1000)) : -1;
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(i); }, []);
  useEffect(() => { if (timed && v && secSec === 0) flush().then(() => load(v.id)); }, [timed, secSec === 0]); // eslint-disable-line
  useEffect(() => { if (timed && v && qSec === 0) { save({}); if (idx < v.questions.length - 1) setIdx(idx + 1); } }, [timed, qSec === 0, idx]); // eslint-disable-line
  useEffect(() => {
    if (!v || !timed) return;
    const bump = () => { if (document.visibilityState === "hidden" || !document.hasFocus()) api<any>(`/attempts/${v.id}/tab-switch`, "POST").then((r) => { setSwitches(r.tabSwitches); if (r.tabSwitches > r.max) load(v.id); }).catch(() => {}); };
    const block = (e: Event) => e.preventDefault(); const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const evs = ["copy", "paste", "cut", "contextmenu"];
    document.addEventListener("visibilitychange", bump); addEventListener("blur", bump); addEventListener("beforeunload", warn); evs.forEach((e) => document.addEventListener(e, block));
    if (v.rules.fullscreen) document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.removeEventListener("visibilitychange", bump); removeEventListener("blur", bump); removeEventListener("beforeunload", warn); evs.forEach((e) => document.removeEventListener(e, block)); };
  }, [v?.id, timed]); // eslint-disable-line

  if (err && !meta && !v) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 500 }}><div className="alert alert-bad"><TriangleAlert size={18} />{err}</div><Link className="btn" to="/dashboard">Back to dashboard</Link></div></div>;

  if (!v) {
    if (!meta) return <div className="grid min-h-screen place-items-center"><div className="text-center"><div className="spinner mx-auto" /><p className="sub mt-3">Preparing your test</p></div></div>;
    const active = meta.activeAttempt;
    const qs = meta.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
    return <div className="exam-landing">
      <div className="exam-landing-inner">
        <Link to="/dashboard" className="brand"><span className="logo"><GraduationCap size={18} /></span>ExamForge</Link>
        <section className="landing-hero card">
          <div className="landing-main"><span className="pill pill-brand">{meta.examName}</span><h1>{meta.name}</h1><p>{meta.description || "A focused mock test built for deliberate practice and measurable improvement."}</p>
            <div className="meta"><span><Clock3 size={15} />{fmt(meta.durationSec)}</span><span>{qs} questions</span><span>{meta.sections.length} sections</span><span className={`pill ${meta.difficulty === "HARD" ? "pill-bad" : meta.difficulty === "EASY" ? "pill-ok" : "pill-warn"}`}>{meta.difficulty.toLowerCase()}</span></div></div>
          <div className="landing-side">{active ? <div className="mode-card featured"><div className="mode-icon"><RotateCcw size={19} /></div><div><b>Resume your attempt</b><small>Continue from where you left off.</small></div><button className="btn btn-primary" disabled={starting} onClick={() => start(active.mode)}>Resume test</button></div> : <>
            <button className={`mode-card ${modeChoice === "EXAM" ? "chosen" : ""}`} onClick={() => setModeChoice("EXAM")}><span className="mode-icon"><Clock3 size={19} /></span><span><b>Exam mode</b><small>Use the configured timer and exam rules.</small></span><span className="mode-check">{modeChoice === "EXAM" ? "✓" : ""}</span></button>
            {meta.allowPracticeMode !== false && <button className={`mode-card ${modeChoice === "PRACTICE" ? "chosen" : ""}`} onClick={() => setModeChoice("PRACTICE")}><span className="mode-icon"><Sparkles size={19} /></span><span><b>Practice mode</b><small>Untimed. Learn at your own pace.</small></span><span className="mode-check">{modeChoice === "PRACTICE" ? "✓" : ""}</span></button>}
            <button className="btn btn-primary btn-lg landing-start" disabled={starting} onClick={() => start(modeChoice)}><Play size={17} />{starting ? "Starting..." : modeChoice === "PRACTICE" ? "Start untimed practice" : "Start exam"}</button>
          </>}</div>
        </section>
        <section className="landing-grid"><div className="card card-pad"><h3 className="card-title">Before you begin</h3><div className="landing-checks"><span>• Answers autosave as you work</span><span>• You can mark questions for review</span><span>• Results stay linked to this attempt</span>{meta.leaderboard && <span>• Exam attempts can appear on the leaderboard</span>}</div></div><div className="card card-pad"><h3 className="card-title">Scoring</h3><div className="score-preview"><b>{meta.positiveMarks}</b><span>marks / correct</span><b>{meta.negativeMarks}</b><span>marks / wrong</span><b>{meta.passingPercent}%</b><span>passing score</span></div></div></section>
        {err && <div className="alert alert-bad">{err}</div>}
      </div>
    </div>;
  }

  if (!q) return <div className="grid min-h-screen place-items-center"><div className="text-center"><div className="spinner mx-auto" /><p className="sub mt-3">Loading question</p></div></div>;
  const all = v.questions.map((x) => local.current[x.id] ?? x);
  const answered = all.filter((x) => x.selectedKey).length, review = all.filter((x) => x.status.includes("REVIEW")).length;
  const cnt = (st: string) => all.filter((x) => x.status === st || (st === "NOT_ANSWERED" && x.status === "VISITED")).length;
  const Palette = <div className="stack" style={{ gap: 14 }}><div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>{all.map((x, i) => <button key={x.id} onClick={() => { go(i); setDrawer(false); }} className={`qb qb-${x.status} ${i === idx ? "cur" : ""}`}>{String(i + 1).padStart(2, "0")}</button>)}</div><div style={{ display: "grid", gap: 7, fontSize: ".78rem" }}>{legend.map(([k, l]) => <div key={k} className="row" style={{ gap: 8, flexWrap: "nowrap" }}><span className={`dot qb qb-${k}`} /><span className="muted">{l}</span><b style={{ marginLeft: "auto" }}>{k === "NOT_VISITED" ? all.filter((x) => x.status === "NOT_VISITED").length : cnt(k)}</b></div>)}</div></div>;
  const pct = Math.round(((idx + 1) / all.length) * 100);

  return <div className="flex min-h-screen flex-col select-none"><header className="exam-top"><div className="row between exam-top-inner">
    <div className="row" style={{ gap: 12 }}><span className="logo" style={{ width: 32, height: 32 }}><GraduationCap size={17} /></span><div><b style={{ display: "block", lineHeight: 1.1 }}>{v.sectionName}</b><span className="sub">{v.test.examName} · Section {v.sectionIdx + 1} of {v.sectionCount}</span></div></div>
    <div className="row" style={{ gap: 8 }}>{timed ? <><div className={`timer ${tCls(testSec)}`}><small>Test</small><b>{fmt(testSec)}</b></div><div className={`timer ${tCls(secSec)}`}><small>Section</small><b>{fmt(secSec)}</b></div>{qSec !== null && <div className={`timer ${tCls(qSec)}`}><small>Question</small><b>{fmt(qSec)}</b></div>}</> : <span className="pill pill-brand"><Sparkles size={13} />Practice · no timer</span>}</div>
    <div className="row" style={{ gap: 8 }}><span className={`pill ${sync === "saved" ? "pill-ok" : "pill-warn"}`}>{sync === "saved" ? <><Cloud size={13} />Saved</> : <><CloudOff size={13} />Offline saved</>}</span><button className="btn btn-ok btn-sm" onClick={() => setConfirm(true)}><Send size={14} />Submit</button></div>
  </div></header>
  {switches > 0 && timed && <div className="alert alert-warn" style={{ borderRadius: 0 }}><TriangleAlert size={17} />You switched away from the test {switches} time{switches > 1 ? "s" : ""}. The test may auto-submit after the configured limit.</div>}
  <div className="flex flex-1" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}><main className="flex-1" style={{ padding: "22px 18px 28px", minWidth: 0 }}>
    <div className="row between" style={{ marginBottom: 10 }}><span className="pill pill-brand">Question {idx + 1} of {all.length}</span><span className="sub">{answered} answered · {review} marked</span></div><div className="bar" style={{ marginBottom: 18 }}><i style={{ width: `${pct}%` }} /></div>
    <div className="card card-pad fade-in" key={q.id}><p style={{ fontSize: "1.1rem", lineHeight: 1.65, fontWeight: 600, whiteSpace: "pre-wrap", margin: "0 0 20px" }}>{q.text}</p><div className="stack" style={{ gap: 10 }}>{q.options.map((o) => <label key={o.key} className={`opt ${q.selectedKey === o.key ? "sel" : ""}`}><input className="sr" type="radio" name="opt" checked={q.selectedKey === o.key} onChange={() => save({ selectedKey: o.key, status: q.status.includes("REVIEW") ? "ANSWERED_REVIEW" : "ANSWERED" })} /><span className="opt-k">{o.key}</span><span style={{ flex: 1 }}>{o.text}</span></label>)}</div></div>
    <div className="action-bar"><button className="btn" onClick={() => save({ status: q.status.includes("REVIEW") ? (q.selectedKey ? "ANSWERED" : "NOT_ANSWERED") : (q.selectedKey ? "ANSWERED_REVIEW" : "REVIEW") })}><Flag size={15} />{q.status.includes("REVIEW") ? "Unmark" : "Mark for review"}</button><button className="btn" onClick={() => save({ selectedKey: null, status: "NOT_ANSWERED" })}><Eraser size={15} />Clear</button><button className="btn md:hidden" onClick={() => setDrawer(true)}><LayoutGrid size={15} />Palette</button><span style={{ flex: 1 }} /><button className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} />Previous</button><button className="btn btn-primary" onClick={() => go(idx + 1)} disabled={idx === all.length - 1}>Save and next<ChevronRight size={16} /></button></div>
  </main><aside className="hidden md:block" style={{ width: 290, flex: "none", padding: "22px 18px 18px 0" }}><div className="card card-pad" style={{ position: "sticky", top: 84 }}><div className="row between" style={{ marginBottom: 14 }}><h3 className="card-title">Question palette</h3><span className="pill">{modeChoice === "PRACTICE" ? "Practice" : "Exam"}</span></div>{Palette}</div></aside></div>
  {drawer && <div className="modal-bg" style={{ alignItems: "end", padding: 0 }} onClick={() => setDrawer(false)}><div className="card card-pad" style={{ width: "100%", borderRadius: "22px 22px 0 0" }} onClick={(e) => e.stopPropagation()}><div className="row between" style={{ marginBottom: 12 }}><h3 className="card-title">Question palette</h3><button className="btn icon-btn" onClick={() => setDrawer(false)}><X size={17} /></button></div>{Palette}</div></div>}
  {confirm && <div className="modal-bg" onClick={() => setConfirm(false)}><div className="card modal stack" style={{ gap: 14 }} onClick={(e) => e.stopPropagation()}><h3 className="card-title" style={{ fontSize: "1.2rem" }}>Submit the {v.mode === "PRACTICE" ? "practice" : "test"}?</h3><div className="grid-stats" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{answered}</div><div className="stat-d">Answered</div></div><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{all.length - answered}</div><div className="stat-d">Unanswered</div></div><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{review}</div><div className="stat-d">Marked</div></div></div><p className="sub">Your answers are saved. You will not be able to edit this attempt after submission.</p><div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setConfirm(false)}>Keep working</button><button className="btn btn-ok" onClick={finish}>Submit {v.mode === "PRACTICE" ? "practice" : "test"}</button></div></div></div>}
  </div>;
}
