import SaveQ from "../components/SaveQ";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLockup } from "../components/LogoMark"; import { Modal, ConfirmDialog, toast } from "../components/ui"; import { sfx, addBonusXp, instantCheckOn, setInstantCheck } from "../lib/game";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Cloud, CloudOff, TriangleAlert, Flag, Eraser, ChevronLeft, ChevronRight, Send,
  LayoutGrid, X, Clock3, Sparkles, Play, BrainCircuit, Zap, Trophy, Trash2, CircleCheck, CircleX, Lightbulb, SkipForward, Eye,
} from "lucide-react";
import { api, fmt, type View, type Q } from "../lib/api";

type Pending = { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number };
const tCls = (s: number) => (s <= 60 ? "crit" : s <= 300 ? "low" : "");
const legend: [string, string][] = [["ANSWERED", "Answered"], ["ANSWERED_REVIEW", "Answered + marked"], ["REVIEW", "Marked for review"], ["NOT_ANSWERED", "Not answered"], ["NOT_VISITED", "Not visited"]];
const stateLabel: Record<string, string> = { ANSWERED: "answered", ANSWERED_REVIEW: "answered and marked for review", REVIEW: "marked for review", NOT_ANSWERED: "not answered", VISITED: "not answered", NOT_VISITED: "not visited" };
type ModeChoice = "EXAM" | "PRACTICE" | "ADAPTIVE";

export default function Exam() {
  const { testId } = useParams(); const nav = useNavigate(); const [sp] = useSearchParams(); const focusTopic = sp.get("topic"); const lastBump = useRef(0); const [combo, setCombo] = useState(0);
  const [reveal, setReveal] = useState<Record<string, { correctKey: string; explanation: string | null }>>({}); const [instant, setInstant] = useState(instantCheckOn()); const [hidden, setHidden] = useState<Record<string, string[]>>({}); const [lifelines, setLifelines] = useState(0);
  const [meta, setMeta] = useState<any | null>(null); const [v, setV] = useState<View | null>(null);
  useEffect(() => { if (v?.mode === "PRACTICE") api("/shop").then((s: any) => setLifelines(s.inventory?.lifelines ?? 0)).catch(() => {}); }, [v?.id]); // eslint-disable-line
  const [idx, setIdx] = useState(0); const [, tick] = useState(0);
  const [sync, setSync] = useState<"saved" | "offline">("saved"); const [switches, setSwitches] = useState(0);
  const [confirm, setConfirm] = useState(false); const [ask, setAsk] = useState<null | { kind: "section" | "discard"; id?: string }>(null); const [submitting, setSubmitting] = useState(false); const [drawer, setDrawer] = useState(false); const [err, setErr] = useState("");
  const [modeChoice, setModeChoice] = useState<ModeChoice>("EXAM"); const [starting, setStarting] = useState(false); const [adaptiveRec, setAdaptiveRec] = useState<any>(null); const [leaders, setLeaders] = useState<any[]>([]);
  const ends = useRef({ test: 0, section: 0 }); const qStart = useRef(Date.now()); const local = useRef<Record<string, Q>>({});
  const qKey = `queue:${testId}`;

  const fetchMeta = useCallback(async () => {
    if (!testId) return;
    const t = await api(`/tests/${testId}`); setMeta(t);
    if (focusTopic) setModeChoice("ADAPTIVE");
    else if (sp.get("mode") === "practice" && t.allowPracticeMode !== false) setModeChoice("PRACTICE");
    else if (t.activeAdaptiveAttempt) setModeChoice("ADAPTIVE");
    else if (t.activePracticeAttempt) setModeChoice("PRACTICE");
  }, [testId]); // eslint-disable-line

  useEffect(() => { fetchMeta().catch((e: any) => setErr(e.message)); }, [fetchMeta]);
  useEffect(() => {
    if (!testId) return;
    api(`/tests/${testId}/adaptive/recommend?count=20`).then(setAdaptiveRec).catch(() => setAdaptiveRec(null));
    if (meta?.leaderboard) api(`/tests/${testId}/leaderboard`).then((r) => setLeaders(r.slice(0, 5))).catch(() => setLeaders([]));
  }, [testId, meta?.leaderboard]);

  const load = useCallback(async (attemptId: string) => {
    try {
      const a = await api<View>(`/attempts/${attemptId}`);
      if (a.status !== "IN_PROGRESS") return nav(`/result/${a.id}`);
      ends.current = { test: a.remaining.test > -1 ? Date.now() + a.remaining.test * 1000 : 0, section: a.remaining.section > -1 ? Date.now() + a.remaining.section * 1000 : 0 };
      if (!v || v.sectionIdx !== a.sectionIdx || v.id !== a.id) { setIdx(0); local.current = {}; setReveal({}); }
      setV(a); qStart.current = Date.now(); setErr("");
    } catch (e: any) { if (e.status === 401) nav("/login"); else setErr(e.message); }
  }, [nav, v]);

  const start = async (choice: ModeChoice) => {
    setStarting(true); setErr(""); setModeChoice(choice);
    try {
      const mode = choice === "EXAM" ? "EXAM" : "PRACTICE";
      const a = await api<View>(`/tests/${testId}/start`, "POST", { mode, adaptive: choice === "ADAPTIVE", topics: choice === "ADAPTIVE" && focusTopic ? [focusTopic] : undefined, questionCount: adaptiveRec?.selectedCount ?? 20 });
      if (a.status !== "IN_PROGRESS") return nav(`/result/${a.id}`);
      setReveal({}); setV(a); ends.current = { test: a.remaining.test > -1 ? Date.now() + a.remaining.test * 1000 : 0, section: a.remaining.section > -1 ? Date.now() + a.remaining.section * 1000 : 0 };
      setIdx(0); local.current = {}; qStart.current = Date.now();
    } catch (e: any) { setErr(e.message); } finally { setStarting(false); }
  };

  // Single-flight autosave queue. Several flushes running at once used to re-send stale answers after newer ones
  // (changing A -> B quickly could end up saved as A) and could drop queued items. Now exactly one loop drains the
  // queue, always re-reading it from storage, and callers (like Submit) can await it.
  const inflight = useRef<Promise<void> | null>(null); const again = useRef(false);
  const flush = useCallback((): Promise<void> => {
    if (!v) return Promise.resolve();
    if (inflight.current) { again.current = true; return inflight.current; }
    const read = (): Pending[] => { try { const q = JSON.parse(localStorage.getItem(qKey) ?? "[]"); return Array.isArray(q) ? q : []; } catch { return []; } };
    const drop = () => { const q = read(); q.shift(); localStorage.setItem(qKey, JSON.stringify(q)); };
    const run = async () => {
      do {
        again.current = false;
        for (;;) {
          const head = read()[0]; if (!head) break;
          try { await api(`/attempts/${v.id}/answer`, "POST", head); drop(); }
          catch (e: any) { if (e.status) drop(); else { setSync("offline"); return; } }
        }
      } while (again.current);
      setSync("saved");
    };
    const p = run().finally(() => { inflight.current = null; });
    inflight.current = p;
    return p;
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
  const finish = async () => {
    if (!v || submitting) return; setErr(""); setSubmitting(true);
    try { await flush(); await api(`/attempts/${v.id}/submit`, "POST"); localStorage.removeItem(qKey); nav(`/result/${v.id}`); }
    catch (e: any) { setConfirm(false); setErr(`Could not submit: ${e.message}. Your answers are saved, press Submit again.`); setSubmitting(false); }
  };
  const nextSection = async () => {
    if (!v) return; setAsk(null);
    try { await flush(); await api(`/attempts/${v.id}/next-section`, "POST"); await load(v.id); } catch (e: any) { setErr(e.message); }
  };
  const discard = async (id: string) => {
    setAsk(null);
    try { await api(`/attempts/${id}`, "DELETE"); localStorage.removeItem(qKey); await fetchMeta(); } catch (e: any) { setErr(e.message); }
  };
  const check = async (qid: string) => { if (!v) return; try { const r = await api(`/attempts/${v.id}/check`, "POST", { questionId: qid }); setReveal((m) => ({ ...m, [qid]: r })); const mine = (local.current[qid] ?? v.questions.find((x) => x.id === qid))?.selectedKey; if (mine === r.correctKey) { sfx("right"); setCombo((c) => c + 1); addBonusXp(10); toast("Correct. +10 XP, +10 coins", "ok"); } else { sfx("wrong"); setCombo(0); } } catch (e: any) { setErr(e.message); } };

  const fifty = async (qid: string) => { try { const r = await api(`/attempts/${v!.id}/fifty`, "POST", { questionId: qid }); setHidden((m) => ({ ...m, [qid]: r.hide })); setLifelines(r.left); sfx("pop"); } catch (e: any) { setErr(e.message); } };
  const timed = v?.mode === "EXAM";
  const qLimit = timed ? q?.timeLimitSec ?? null : null;
  const qSec = qLimit ? Math.max(0, qLimit - Math.floor((Date.now() - qStart.current + (q?.timeSpentMs ?? 0)) / 1000)) : null;
  const secSec = timed && ends.current.section ? Math.max(0, Math.round((ends.current.section - Date.now()) / 1000)) : -1;
  const testSec = timed && ends.current.test ? Math.max(0, Math.round((ends.current.test - Date.now()) / 1000)) : -1;
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(i); }, []);
  useEffect(() => { if (timed && v && secSec === 0) flush().then(() => load(v.id)); }, [timed, secSec === 0]); // eslint-disable-line
  useEffect(() => { if (timed && testSec === 60) { toast("One minute left in this test.", "bad"); sfx("wrong"); } if (timed && testSec === 300) toast("Five minutes left.", "info"); }, [testSec]); // eslint-disable-line
  useEffect(() => { if (timed && v && qSec === 0) { save({}); if (idx < v.questions.length - 1) setIdx(idx + 1); } }, [timed, qSec === 0, idx]); // eslint-disable-line
  useEffect(() => {
    if (!v || !timed) return;
    const bump = () => { if (Date.now() - lastBump.current < 2500) return; if (document.visibilityState === "hidden" || !document.hasFocus()) { lastBump.current = Date.now(); api<any>(`/attempts/${v.id}/tab-switch`, "POST").then((r) => { setSwitches(r.tabSwitches); if (r.tabSwitches > r.max) load(v.id); }).catch(() => {}); } };
    const block = (e: Event) => e.preventDefault(); const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const evs = ["copy", "paste", "cut", "contextmenu"];
    document.addEventListener("visibilitychange", bump); addEventListener("blur", bump); addEventListener("beforeunload", warn); evs.forEach((e) => document.addEventListener(e, block));
    if (v.rules.fullscreen) document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.removeEventListener("visibilitychange", bump); removeEventListener("blur", bump); removeEventListener("beforeunload", warn); evs.forEach((e) => document.removeEventListener(e, block)); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, [v?.id, timed]); // eslint-disable-line

  useEffect(() => {
    if (!v || confirm) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && (t as HTMLInputElement).type !== "radio") return;
      if (e.ctrlKey || e.metaKey || e.altKey || !q) return; const k = e.key.toLowerCase();
      if (["a", "b", "c", "d", "1", "2", "3", "4"].includes(k)) { const key = "ABCD"["abcd".includes(k) ? "abcd".indexOf(k) : +k - 1]; if (q.options.some((o) => o.key === key) && !reveal[q.id]) save({ selectedKey: key, status: q.status.includes("REVIEW") ? "ANSWERED_REVIEW" : "ANSWERED" }); }
      else if (k === "arrowright" || k === "n") go(idx + 1); else if (k === "arrowleft" || k === "p") go(idx - 1);
      else if (k === "m") save({ status: q.status.includes("REVIEW") ? (q.selectedKey ? "ANSWERED" : "NOT_ANSWERED") : (q.selectedKey ? "ANSWERED_REVIEW" : "REVIEW") });
    };
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey);
  }); // eslint-disable-line

  if (err && !meta && !v) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 560 }}><div className="alert alert-bad"><TriangleAlert size={18} />{err}</div><Link className="btn" to="/dashboard">Back to dashboard</Link></div></div>;

  if (!v) {
    if (!meta) return <div className="grid min-h-screen place-items-center"><div className="text-center"><div className="spinner mx-auto" /><p className="sub mt-3">Preparing your test</p></div></div>;
    const qs = meta.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
    const activeExam = meta.activeExamAttempt; const activePractice = meta.activePracticeAttempt; const activeAdaptive = meta.activeAdaptiveAttempt;
    const modeDescription = modeChoice === "EXAM" ? "Timed like the real exam. Counts on the leaderboard." : modeChoice === "PRACTICE" ? "No timer. See the answer and explanation right after each question." : "We pick questions from your weak topics, based on your past attempts.";
    return <div className="exam-landing">
      <div className="exam-landing-inner">
        <Link to="/dashboard" className="brand" aria-label="ExamForge, back to dashboard"><BrandLockup size={32} /></Link>
        <section className="landing-hero card">
          <div className="landing-main">
            <span className="pill pill-brand">{meta.examName}</span><h1>{meta.name}</h1>
            <p>{meta.description || "A focused mock test built for deliberate practice and measurable improvement."}</p>
            <div className="meta"><span><Clock3 size={15} />{fmt(meta.durationSec)}</span><span>{qs} questions</span><span>{meta.sections.length} section{meta.sections.length > 1 ? "s" : ""}</span><span className={`pill ${meta.difficulty === "HARD" ? "pill-bad" : meta.difficulty === "EASY" ? "pill-ok" : "pill-warn"}`}>{meta.difficulty.toLowerCase()}</span></div>
            {focusTopic && <div className="alert alert-info" style={{ marginTop: 12 }}><BrainCircuit size={16} /><span>Focused practice on <b>{focusTopic}</b>. Questions on this topic are picked first, hardest-weakness first.</span></div>}<p style={{ marginTop: 16 }} aria-live="polite"><b style={{ color: "var(--text)" }}>{modeChoice === "ADAPTIVE" ? "Smart practice" : modeChoice === "PRACTICE" ? "Practice" : "Exam"}:</b> {modeDescription}</p>
          </div>
          <div className="landing-side">
            {(activeExam || activePractice || activeAdaptive) && <div className="resume-stack">
              {activeExam && <div className="resume-card"><div><span className="pill pill-warn">Exam in progress</span><b>Resume your timed attempt</b><small>Attempt #{activeExam.attemptNo} is still open.</small></div><div className="row"><button className="btn btn-primary" onClick={() => load(activeExam.id)}>Resume</button><button className="btn btn-sm btn-danger" title="Discard attempt" aria-label="Discard exam attempt" onClick={() => setAsk({ kind: "discard", id: activeExam.id })}><Trash2 size={14} /></button></div></div>}
              {activePractice && <div className="resume-card"><div><span className="pill pill-brand">Practice in progress</span><b>Resume untimed practice</b><small>Your answers are already saved.</small></div><div className="row"><button className="btn" onClick={() => load(activePractice.id)}>Resume</button><button className="btn btn-sm btn-danger" title="Discard session" aria-label="Discard practice session" onClick={() => setAsk({ kind: "discard", id: activePractice.id })}><Trash2 size={14} /></button></div></div>}
              {activeAdaptive && <div className="resume-card"><div><span className="pill pill-ok">Adaptive in progress</span><b>Resume adaptive session</b><small>Continue your personalised practice.</small></div><div className="row"><button className="btn" onClick={() => load(activeAdaptive.id)}>Resume</button><button className="btn btn-sm btn-danger" title="Discard session" aria-label="Discard adaptive session" onClick={() => setAsk({ kind: "discard", id: activeAdaptive.id })}><Trash2 size={14} /></button></div></div>}
            </div>}
            <button aria-pressed={modeChoice === "EXAM"} className={`mode-card ${modeChoice === "EXAM" ? "chosen" : ""}`} onClick={() => setModeChoice("EXAM")}><span className="mode-icon"><Clock3 size={19} /></span><span><b>Exam mode</b><small>Timed. Counts on the leaderboard.</small></span><span className="mode-check">{modeChoice === "EXAM" ? "✓" : ""}</span></button>
            {meta.allowPracticeMode !== false && <button aria-pressed={modeChoice === "PRACTICE"} className={`mode-card ${modeChoice === "PRACTICE" ? "chosen" : ""}`} onClick={() => setModeChoice("PRACTICE")}><span className="mode-icon"><Sparkles size={19} /></span><span><b>Practice mode</b><small>No timer. Instant answers. Best for learning.</small></span><span className="mode-check">{modeChoice === "PRACTICE" ? "✓" : ""}</span></button>}
            {meta.allowPracticeMode !== false && <button aria-pressed={modeChoice === "ADAPTIVE"} className={`mode-card adaptive ${modeChoice === "ADAPTIVE" ? "chosen" : ""}`} onClick={() => setModeChoice("ADAPTIVE")}><span className="mode-icon"><BrainCircuit size={19} /></span><span><b>Smart practice</b><small>Focuses on topics you find hard.</small>{adaptiveRec && <em>{adaptiveRec.selectedCount} questions · {adaptiveRec.topics?.slice(0, 2).join(" · ") || "personalised mix"}</em>}</span><span className="mode-check">{modeChoice === "ADAPTIVE" ? "✓" : ""}</span></button>}
            <button className="btn btn-primary btn-lg landing-start" disabled={starting} onClick={() => start(modeChoice)}>{modeChoice === "ADAPTIVE" ? <BrainCircuit size={17} /> : modeChoice === "PRACTICE" ? <Sparkles size={17} /> : <Play size={17} />}{starting ? "Starting..." : modeChoice === "ADAPTIVE" ? "Start adaptive practice" : modeChoice === "PRACTICE" ? "Start untimed practice" : "Start exam"}</button>
          </div>
        </section>
        <section className="landing-grid">
          <div className="card card-pad"><h3 className="card-title">Good to know</h3><div className="landing-checks"><span>• Your answers save automatically</span><span>• Mark hard questions and come back to them</span><span>• Only Exam mode counts on the leaderboard</span></div></div>
          <div className="card card-pad"><h3 className="card-title">Marking</h3><div className="score-preview"><b>+{meta.positiveMarks}</b><span>per correct answer</span><b>{meta.negativeMarks}</b><span>per wrong answer</span><b>{meta.passingPercent}%</b><span>to pass</span></div></div>
        </section>
        {meta.leaderboard && leaders.length > 0 && <section className="card card-pad stack"><div className="row between"><div><h3 className="card-title row" style={{gap:8}}><Trophy size={18}/>Test leaderboard</h3><p className="sub">Only official Exam mode attempts are included.</p></div><span className="pill pill-brand">Top 5</span></div><div className="leaderboard-list">{leaders.map((r) => <div className="leaderboard-row" key={`${r.rank}-${r.name}`}><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Trophy size={14}/> : `#${r.rank}`}</span><div style={{flex:1,minWidth:0}}><b style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</b><span className="sub">{fmt(r.timeTakenSec)} total time</span></div><div className="leader-score"><b>{r.percentage}%</b><small>{r.accuracy}% accuracy</small></div></div>)}</div></section>}
        {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={17} />{err}</div>}
      </div>
      <ConfirmDialog open={ask?.kind === "discard"} danger title="Discard this unfinished attempt?" confirmLabel="Discard" onConfirm={() => ask?.id && discard(ask.id)} onCancel={() => setAsk(null)}>Its saved answers will be deleted.</ConfirmDialog>
    </div>;
  }

  if (!q) return <div className="grid min-h-screen place-items-center p-6"><div className="card card-pad stack" style={{ maxWidth: 620 }}><div className="alert alert-bad"><TriangleAlert size={18} />This attempt did not return any available questions for the active section.</div><p className="sub">Refresh the attempt or return to the test and start a new session. Your existing saved attempt is still in the database.</p><div className="row"><Link className="btn" to="/dashboard">Back to tests</Link><button className="btn btn-primary" onClick={() => load(v.id)}>Reload attempt</button></div></div></div>;
  const all = v.questions.map((x) => local.current[x.id] ?? x);
  const answered = all.filter((x) => x.selectedKey).length, review = all.filter((x) => x.status.includes("REVIEW")).length;
  const cnt = (st: string) => all.filter((x) => x.status === st || (st === "NOT_ANSWERED" && x.status === "VISITED")).length;
  const left = all.length - answered; const Palette = <div className="stack" style={{ gap: 14 }}><div className="count-row"><div className="count-tile ok"><b>{answered}</b><span>Answered</span></div><div className="count-tile mk"><b>{review}</b><span>Marked</span></div><div className="count-tile lf"><b>{left}</b><span>Left</span></div></div><div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>{all.map((x, i) => <button key={x.id} onClick={() => { go(i); setDrawer(false); }} className={`qb qb-${x.status} ${i === idx ? "cur" : ""}`} aria-current={i === idx ? "true" : undefined} aria-label={`Question ${i + 1}: ${stateLabel[x.status] ?? "Not visited"}`}>{String(i + 1).padStart(2, "0")}</button>)}</div><div style={{ display: "grid", gap: 7, fontSize: ".78rem" }}>{legend.map(([k, l]) => <div key={k} className="row" style={{ gap: 8, flexWrap: "nowrap" }}><span className={`dot qb qb-${k}`} aria-hidden="true" /><span className="muted">{l}</span><b style={{ marginLeft: "auto" }}>{k === "NOT_VISITED" ? all.filter((x) => x.status === "NOT_VISITED").length : cnt(k)}</b></div>)}</div></div>;
  const pct = Math.round(((idx + 1) / all.length) * 100);
  const sessionLabel = v.adaptive ? "Adaptive practice" : v.mode === "PRACTICE" ? "Practice" : "Exam";

  return <div className="flex min-h-screen flex-col select-none">
    <header className="exam-top"><div className="row between exam-top-inner">
      <div className="row exam-title" style={{ gap: 12 }}><span className="exam-logo"><BrandLockup size={30} /></span><div><h1 style={{ display: "block", lineHeight: 1.1, fontSize: "inherit", fontWeight: 700, margin: 0 }}>{v.sectionName}</h1><span className="sub">{v.test.examName}{v.mode === "EXAM" ? ` · Section ${v.sectionIdx + 1} of ${v.sectionCount}` : ` · ${v.sectionCount} section${v.sectionCount > 1 ? "s" : ""} together`}</span></div></div>
      <div className="row exam-timers" style={{ gap: 8 }}>{timed ? <><div className={`timer ${tCls(testSec)}`}><small>Test</small><b>{fmt(testSec)}</b></div><div className={`timer ${tCls(secSec)}`}><small>Section</small><b>{fmt(secSec)}</b></div>{qSec !== null && <div className={`timer ${tCls(qSec)}`}><small>Qn</small><b>{fmt(qSec)}</b></div>}</> : <span className={`pill ${v.adaptive ? "pill-ok" : "pill-brand"}`}><Sparkles size={13} />{sessionLabel} · no timer</span>}</div>
      <div className="row exam-actions" style={{ gap: 8 }}><span className={`pill sync-pill ${sync === "saved" ? "pill-ok" : "pill-warn"}`}>{sync === "saved" ? <><Cloud size={13} /><span className="txt">Saved</span></> : <><CloudOff size={13} /><span className="txt">Offline saved</span></>}</span>{timed && v.isLastSection === false && <button className="btn btn-sm" onClick={() => setAsk({ kind: "section" })}><SkipForward size={14} /><span className="txt">Next section</span></button>}<button className="btn btn-ok btn-sm" onClick={() => setConfirm(true)}><Send size={14} />Submit</button></div>
    </div></header>
    {err && <div className="alert alert-bad" style={{ borderRadius: 0 }}><TriangleAlert size={17} />{err}</div>}
    {v.adaptive && <div className="adaptive-banner"><BrainCircuit size={16} /><span><b>Adaptive focus:</b> {v.adaptiveTopics?.slice(0, 4).join(" · ") || "your weaker areas"}</span></div>}
    {switches > 0 && timed && <div className="alert alert-warn" style={{ borderRadius: 0 }}><TriangleAlert size={17} />You switched away from the test {switches} time{switches > 1 ? "s" : ""}. The test may auto-submit after the configured limit.</div>}
    <div className="flex flex-1" style={{ maxWidth: 1280, margin: "0 auto", width: "100%" }}><main className="flex-1" style={{ padding: "22px 18px 28px", minWidth: 0 }}>
      <div className="row between" style={{ marginBottom: 10 }}><span className="pill pill-brand">Question {idx + 1} of {all.length}</span>{combo >= 3 && <span className="pill pill-gold">{combo} correct in a row</span>}<span className="sub">{answered} of {all.length} answered</span></div><div className="bar" style={{ marginBottom: 18 }}><i style={{ width: `${pct}%` }} /></div>
      <div key={q.id} className="q-slide">{(() => { const rv = reveal[q.id]; const practice = v.mode === "PRACTICE";
        const pick = (key: string) => { if (rv) return; save({ selectedKey: key, status: q.status.includes("REVIEW") ? "ANSWERED_REVIEW" : "ANSWERED" }); if (practice && instant) setTimeout(() => check(q.id), 350); };
        return <div className="card card-pad fade-in" key={q.id}>
          <div className="row" style={{ gap: 6, marginBottom: 10 }}>{q.section && v.mode === "PRACTICE" && <span className="pill">{q.section}</span>}{q.topic && practice && <span className="pill pill-brand">{q.topic}</span>}<span style={{ marginLeft: "auto" }}><SaveQ key={q.id} text={q.text} options={q.options} topic={q.topic} testName={(v as any).testName ?? "Test"} /></span></div>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.65, fontWeight: 600, whiteSpace: "pre-wrap", margin: "0 0 20px" }}>{q.text}</p>
          <div className="stack" style={{ gap: 10 }} role="radiogroup" aria-label="Answer options">{q.options.map((o) => <label key={o.key} className={`opt ${hidden[q.id]?.includes(o.key) ? "opt-hidden" : ""} ${q.selectedKey === o.key ? "sel" : ""} ${rv && rv.correctKey === o.key ? "right" : rv && q.selectedKey === o.key ? "wrong" : ""}`}><input className="sr" type="radio" name={`opt-${q.id}`} checked={q.selectedKey === o.key} disabled={!!rv || !!hidden[q.id]?.includes(o.key)} onChange={() => pick(o.key)} /><span className="opt-k">{o.key}</span><span style={{ flex: 1 }}>{o.text}</span>{rv && rv.correctKey === o.key && <CircleCheck size={18} color="var(--ok)" aria-label="Correct answer" />}{rv && q.selectedKey === o.key && rv.correctKey !== o.key && <CircleX size={18} color="var(--bad)" aria-label="Your answer, incorrect" />}</label>)}</div>
          {practice && <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            {!rv ? <div className="row">{!hidden[q.id] && (lifelines > 0 ? <button className="btn btn-sm" onClick={() => fifty(q.id)} title="Hide two wrong options">50-50 ({lifelines} left)</button> : <a className="btn btn-sm" href="/shop" target="_blank" rel="noopener noreferrer" title="Buy lifelines with coins">Get 50-50 lifelines</a>)}<button className="btn btn-sm" disabled={!q.selectedKey} onClick={() => check(q.id)}><Eye size={14} />Check answer</button><label className="sub row" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" checked={instant} onChange={(e) => { setInstant(e.target.checked); setInstantCheck(e.target.checked); }} />Check automatically after I pick</label></div>
              : <div role="status" className={`alert ${q.selectedKey === rv.correctKey ? "alert-ok" : "alert-bad"}`} style={{ alignItems: "flex-start" }}>{q.selectedKey === rv.correctKey ? <CircleCheck size={18} /> : <CircleX size={18} />}<div><b>{q.selectedKey === rv.correctKey ? "Correct!" : `Wrong. Correct answer is ${rv.correctKey}.`}</b>{rv.explanation && <div style={{ marginTop: 4, display: "flex", gap: 6 }}><Lightbulb size={16} style={{ flex: "none", marginTop: 2 }} /><span>{rv.explanation}</span></div>}</div></div>}</div>}
        </div>; })()}</div>
      <div className="action-bar"><button className="status-btn md:hidden" onClick={() => setDrawer(true)} aria-label="Open question palette"><span className="ok"><CircleCheck size={15} />{answered}</span><span className="mk"><Flag size={14} />{review}</span><span className="lf">{all.length - answered} left</span><span className="go"><LayoutGrid size={15} />Questions</span></button><button className="btn ab-mark" onClick={() => save({ status: q.status.includes("REVIEW") ? (q.selectedKey ? "ANSWERED" : "NOT_ANSWERED") : (q.selectedKey ? "ANSWERED_REVIEW" : "REVIEW") })}><Flag size={15} />{q.status.includes("REVIEW") ? "Unmark" : "Mark for review"}</button><button className="btn" onClick={() => save({ selectedKey: null, status: "NOT_ANSWERED" })}><Eraser size={15} />Clear</button><span style={{ flex: 1 }} /><button className="btn ab-prev" onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} />Previous</button><button className="btn btn-primary ab-next" onClick={() => go(idx + 1)} disabled={idx === all.length - 1}>Next<ChevronRight size={16} /></button></div>
    </main>
    <aside className="hidden md:block" style={{ width: 290, flex: "none", padding: "22px 18px 18px 0" }}><div className="card card-pad" style={{ position: "sticky", top: 84 }}><div className="row between" style={{ marginBottom: 14 }}><h3 className="card-title">Question palette</h3><span className="pill">{sessionLabel}</span></div>{Palette}</div></aside>
    </div>
    {drawer && <Modal open onClose={() => setDrawer(false)} title="Question palette">{Palette}</Modal>}
    <Modal open={confirm} onClose={() => !submitting && setConfirm(false)} title={`Submit the ${v.adaptive ? "adaptive practice" : v.mode === "PRACTICE" ? "practice" : "test"}?`} dismissible={!submitting} alert>
      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{answered}</div><div className="stat-d">Answered</div></div><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{all.length - answered}</div><div className="stat-d">Unanswered</div></div><div className="qcard"><div className="stat-v" style={{ fontSize: "1.3rem" }}>{review}</div><div className="stat-d">Marked</div></div></div>
      <p className="sub">Your answers are saved. You will not be able to edit this attempt after submission.</p>
      <div className="modal-actions"><button className="btn" disabled={submitting} onClick={() => setConfirm(false)} data-autofocus>Keep working</button><button className="btn btn-ok" disabled={submitting} onClick={finish}>{submitting ? "Submitting..." : "Submit"}</button></div>
    </Modal>
    <ConfirmDialog open={ask?.kind === "section"} title="Finish this section?" confirmLabel="Finish section" onConfirm={nextSection} onCancel={() => setAsk(null)}>You cannot come back to this section after moving on.</ConfirmDialog>
  </div>;
}
