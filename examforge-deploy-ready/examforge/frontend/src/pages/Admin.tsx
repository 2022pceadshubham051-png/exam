import { useCallback, useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { Plus, Trash2, Copy, Check, CircleCheck, CircleX, TriangleAlert, ArrowLeft, FileText, Layers, Clock, Rocket, Upload, ListChecks, Settings2, Link as LinkIcon, Sparkles, Info, X, Search, BarChart3, Pencil, Wand2, RotateCcw, Save } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

const SAMPLE = `Question 1. Which protocol is secure?
A) HTTP
B) HTTPS
C) FTP
D) SMTP
Answer: B
Explanation: HTTPS uses TLS encryption.
Difficulty: EASY
Topic: Networking

Question 2. Which data structure follows FIFO?
A) Stack
B) Queue
C) Tree
D) Graph
Answer: B
Explanation: A queue removes the oldest item first.
Difficulty: MEDIUM
Topic: Data Structures`;

const buildPrompt = (n: number, topic: string, sec: string) => `Generate ${n} multiple-choice questions on "${topic || "<your topic>"}"${sec ? ` for the section "${sec}"` : ""}.
Use EXACTLY this format for every question, with a blank line between questions:

Question N. <question text>
A) <option>
B) <option>
C) <option>
D) <option>
Answer: <A, B, C or D>
Explanation: <one or two lines>
Difficulty: <EASY, MEDIUM or HARD>
Topic: <sub-topic>

Rules: exactly four options, exactly one correct answer, no bold or markdown, no tables, no extra text before or after the questions.`;

const useCopy = () => { const [k, setK] = useState(""); return [k, (id: string, t: string) => { navigator.clipboard?.writeText(t); setK(id); setTimeout(() => setK(""), 1600); }] as const; };
type Sec = { name: string; minutes: number };
const defaults = { name: "", examName: "", description: "", minutes: 60, positiveMarks: 1, negativeMarks: 0.25, passingPercent: 40, difficulty: "MEDIUM", maxTabSwitches: 3,
  globalQuestionSec: "", maxAttempts: "", shuffleQuestions: false, shuffleOptions: false, requireFullscreen: true, showResult: true, showExplanations: true, leaderboard: true,
  allowPracticeMode: true, allowSectionSwitch: false, allowSectionBacktrack: false };

export default function Admin() {
  const [list, setList] = useState<any[] | null>(null); const [test, setTest] = useState<any>(null); const [creating, setCreating] = useState(false); const [filter, setFilter] = useState("ALL"); const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<{ t: "ok" | "bad" | "info"; m: string } | null>(null); const [del, setDel] = useState<any>(null);
  const flash = (t: "ok" | "bad" | "info", m: string) => { setMsg({ t, m }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const loadList = useCallback(() => api("/tests").then(setList).catch((e) => flash("bad", e.message)), []);
  const open = useCallback(async (id: string) => { try { setTest(await api(`/tests/${id}`)); setCreating(false); setMsg(null); } catch (e: any) { flash("bad", e.message); } }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const back = () => { setTest(null); setCreating(false); setMsg(null); loadList(); };
  const remove = async () => { try { await api(`/tests/${del.id}`, "DELETE"); setDel(null); flash("ok", "Exam and all linked attempts/questions were permanently deleted."); loadList(); } catch (e: any) { setDel(null); flash("bad", e.message); } };
  const duplicate = async (t: any) => { try { const copy = await api(`/tests/${t.id}/duplicate`, "POST"); flash("ok", `Created draft copy: ${copy.name}`); loadList(); } catch (e: any) { flash("bad", e.message); } };
  const totalQ = (t: any) => t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);

  const published = list?.filter((t) => t.published).length ?? 0;
  const drafts = list?.filter((t) => !t.published).length ?? 0;
  const questionTotal = list?.reduce((a, t) => a + totalQ(t), 0) ?? 0;
  const practiceEnabled = list?.filter((t) => t.allowPracticeMode !== false).length ?? 0;
  const filteredList = (list ?? []).filter((t) => (filter === "ALL" || (filter === "LIVE" ? t.published : !t.published)) && (!search.trim() || `${t.name} ${t.examName}`.toLowerCase().includes(search.trim().toLowerCase())));

  return <Shell>
    <div className="stack">
      <div className="row between">
        <div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Admin Studio</h1><p className="sub">Create tests, add questions and publish them to students.</p></div>
        {(test || creating) ? <button className="btn" onClick={back}><ArrowLeft size={16} />All tests</button> : <button className="btn btn-primary" onClick={() => { setCreating(true); setMsg(null); }}><Plus size={16} />New test</button>}
      </div>
      {!test && !creating && list && <section className="grid-stats admin-stats"><div className="stat"><div className="stat-l">Total exams</div><div className="stat-v">{list.length}</div></div><div className="stat"><div className="stat-l">Published</div><div className="stat-v">{published}</div></div><div className="stat"><div className="stat-l">Drafts</div><div className="stat-v">{drafts}</div></div><div className="stat"><div className="stat-l">Practice enabled</div><div className="stat-v">{practiceEnabled}</div></div><div className="stat"><div className="stat-l"><BarChart3 size={14}/>Question inventory</div><div className="stat-v">{questionTotal}</div></div></section>}
      {msg && <div className={`alert alert-${msg.t === "info" ? "info" : msg.t}`}>{msg.t === "ok" ? <CircleCheck size={18} /> : msg.t === "bad" ? <CircleX size={18} /> : <Info size={18} />}<span style={{ flex: 1 }}>{msg.m}</span><button className="btn-ghost btn btn-sm" onClick={() => setMsg(null)}><X size={14} /></button></div>}

      {creating && <CreateTest onCreated={(t) => { flash("ok", "Test created. Now add questions."); open(t.id); }} onError={(m) => flash("bad", m)} />}
      {test && <Manage key={test.id} test={test} reload={() => open(test.id)} flash={flash} />}

      {!test && !creating && <>
        {list && <div className="admin-toolbar card card-pad"><div className="row between" style={{gap:12,flexWrap:"wrap"}}><div><b>Test library</b><div className="sub">Search, filter and manage your live exams without opening each one.</div></div><div className="row" style={{gap:8,flexWrap:"wrap"}}><div className="seg"><button className={filter === "ALL" ? "on" : ""} onClick={() => setFilter("ALL")}>All</button><button className={filter === "LIVE" ? "on" : ""} onClick={() => setFilter("LIVE")}>Published</button><button className={filter === "DRAFT" ? "on" : ""} onClick={() => setFilter("DRAFT")}>Drafts</button></div><div style={{position:"relative",minWidth:220}}><Search size={15} style={{position:"absolute",left:12,top:12,color:"var(--muted)"}}/><input className="input" style={{paddingLeft:36}} placeholder="Search tests" value={search} onChange={(e) => setSearch(e.target.value)}/></div></div></div></div>}
        {!list ? <Loading /> : filteredList.length ? <div className="grid-auto">{filteredList.map((t) => <article key={t.id} className="card tcard">
          <div className="row between"><span className="pill pill-brand">{t.examName}</span><div className="row" style={{gap:6}}>{t.allowPracticeMode !== false && <span className="pill pill-brand"><Sparkles size={12}/>Practice</span>}{t.published ? <span className="pill pill-ok">Published</span> : <span className="pill pill-warn">Draft</span>}</div></div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>{t.name}</h3>
          <div className="meta"><span><Clock size={15} />{Math.round(t.durationSec / 60)} min</span><span><FileText size={15} />{totalQ(t)} questions</span><span><Layers size={15} />{t.sections.length} sections</span></div>
          <div className="row" style={{ marginTop: "auto", flexWrap: "wrap" }}><button className="btn btn-primary btn-sm" onClick={() => open(t.id)}><Settings2 size={15} />Manage</button><button className="btn btn-sm" onClick={() => duplicate(t)}><Copy size={15} />Duplicate</button>
            <button className="btn btn-danger btn-sm" onClick={() => setDel(t)}><Trash2 size={15} />Delete forever</button></div></article>)}</div>
          : <div className="card empty"><FileText size={36} /><p>{list.length && (filter !== "ALL" || search) ? "No tests match these filters." : "You have not created any test yet."}</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setCreating(true)}><Plus size={16} />Create your first test</button></div>}
      </>}
    </div>
    {del && <div className="modal-bg" onClick={() => setDel(null)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title">Delete "{del.name}" permanently?</h3><p className="sub">This is a hard delete. The exam, sections, questions, attempts, results and linked analytics will be removed from the database. This cannot be undone.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}><Trash2 size={15} />Delete</button></div></div></div>}
  </Shell>;
}

function Toggle({ label, hint, v, set }: { label: string; hint: string; v: boolean; set: (b: boolean) => void }) {
  return <label className="switch"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /><span>{label}<small>{hint}</small></span></label>;
}

/* ---------------------------------------------------------------- create */
function CreateTest({ onCreated, onError }: { onCreated: (t: any) => void; onError: (m: string) => void }) {
  const [f, setF] = useState<any>(defaults); const [secs, setSecs] = useState<Sec[]>([{ name: "", minutes: 20 }]); const [busy, setBusy] = useState(false);
  const [exams, setExams] = useState<any[]>([]); useEffect(() => { api("/coach/exams").then((r) => setExams(r.exams)).catch(() => {}); }, []);
  const applyTemplate = (id: string) => {
    const ex = exams.find((e) => e.id === id); if (!ex) return;
    const perQ = ex.totalMarks / ex.totalQuestions; let mins = ex.subjects.map((s: any) => Math.max(1, Math.round((ex.durationMin * s.questions) / ex.totalQuestions)));
    let diff = mins.reduce((a: number, b: number) => a + b, 0) - ex.durationMin; for (let i = mins.length - 1; diff > 0 && i >= 0; i--) { const cut = Math.min(diff, mins[i] - 1); mins[i] -= cut; diff -= cut; }
    setF((o: any) => ({ ...o, examName: ex.name, name: o.name || `${ex.name} ${ex.stage} Mock 1`, minutes: ex.durationMin, positiveMarks: +perQ.toFixed(2), negativeMarks: +(perQ * ex.negativeRatio).toFixed(2), description: o.description || `${ex.subjects.length} subjects · ${ex.totalQuestions} questions · ${ex.stage}` }));
    setSecs(ex.subjects.map((s: any, i: number) => ({ name: s.name, minutes: mins[i] })));
  };
  const set = (k: string, v: any) => setF((o: any) => ({ ...o, [k]: v })); const num = (k: string) => (e: any) => set(k, e.target.value === "" ? "" : +e.target.value);
  const sum = secs.reduce((a, s) => a + (+s.minutes || 0), 0); const over = sum > f.minutes;
  const upd = (i: number, p: Partial<Sec>) => setSecs(secs.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const submit = async () => {
    if (!f.name.trim() || !f.examName.trim()) return onError("Please fill the test name and exam name.");
    if (secs.some((s) => !s.name.trim() || !(+s.minutes > 0))) return onError("Every section needs a name and minutes greater than 0.");
    if (over) return onError(`Section minutes (${sum}) are more than the total test time (${f.minutes}).`);
    setBusy(true);
    try {
      const t = await api("/tests", "POST", { name: f.name.trim(), examName: f.examName.trim(), description: f.description.trim() || undefined, durationSec: Math.round(f.minutes * 60),
        negativeMarks: +f.negativeMarks, positiveMarks: +f.positiveMarks, passingPercent: +f.passingPercent, difficulty: f.difficulty, maxTabSwitches: +f.maxTabSwitches,
        globalQuestionSec: f.globalQuestionSec === "" ? null : +f.globalQuestionSec, maxAttempts: f.maxAttempts === "" ? null : +f.maxAttempts,
        allowPracticeMode: f.allowPracticeMode, allowSectionSwitch: f.allowSectionSwitch, allowSectionBacktrack: f.allowSectionBacktrack,
        shuffleQuestions: f.shuffleQuestions, shuffleOptions: f.shuffleOptions, requireFullscreen: f.requireFullscreen, showResult: f.showResult, showExplanations: f.showExplanations, leaderboard: f.leaderboard,
        sections: secs.map((s) => ({ name: s.name.trim(), durationSec: Math.round(+s.minutes * 60) })) });
      onCreated(t);
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  };
  return <div className="stack fade-in">
    {exams.length > 0 && <section className="card card-pad stack"><div><h2 className="card-title row" style={{ gap: 8 }}><Wand2 size={18} />Start from a real exam pattern <small className="muted" style={{ fontWeight: 500 }}>(optional)</small></h2><p className="sub">Fills exam name, time, marking and one section per subject with the right timing. You can still change everything below.</p></div>
      <select className="input" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}><option value="">Choose SSC / Railway / IMD pattern...</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.stage} ({e.totalQuestions} Q, {e.durationMin} min)</option>)}</select></section>}
    <section className="card card-pad stack"><div><h2 className="card-title">Basic details</h2><p className="sub">What students will see on the test card.</p></div>
      <div className="form-grid"><div><label className="label">Test name</label><input className="input" placeholder="e.g. Reasoning Mock 1" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className="label">Exam name</label><input className="input" placeholder="e.g. SSC CGL" value={f.examName} onChange={(e) => set("examName", e.target.value)} /><p className="hint">Used to group and filter tests.</p></div></div>
      <div><label className="label">Description <small>(optional)</small></label><input className="input" placeholder="One line about this test" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div><label className="label">Difficulty</label><div className="seg">{["EASY", "MEDIUM", "HARD"].map((d) => <button key={d} type="button" className={f.difficulty === d ? "on" : ""} onClick={() => set("difficulty", d)}>{d[0] + d.slice(1).toLowerCase()}</button>)}</div></div>
    </section>

    <section className="card card-pad stack"><div><h2 className="card-title">Time and marking</h2><p className="sub">How long the test runs and how it is scored.</p></div>
      <div className="form-grid">
        <div><label className="label">Total test time <small>(minutes)</small></label><input className="input" type="number" min={1} value={f.minutes} onChange={num("minutes")} /></div>
        <div><label className="label">Marks for a correct answer</label><input className="input" type="number" step="0.25" min={0} value={f.positiveMarks} onChange={num("positiveMarks")} /></div>
        <div><label className="label">Marks cut for a wrong answer</label><input className="input" type="number" step="0.05" min={0} value={f.negativeMarks} onChange={num("negativeMarks")} /><p className="hint">0.25 means a quarter mark is deducted. Use 0 for no negative marking.</p></div>
        <div><label className="label">Passing percentage</label><input className="input" type="number" min={0} max={100} value={f.passingPercent} onChange={num("passingPercent")} /></div>
        <div><label className="label">Question timer <small>(seconds, optional)</small></label><input className="input" type="number" min={1} value={f.globalQuestionSec} placeholder="No limit" onChange={num("globalQuestionSec")} /><p className="hint">Leave blank for no per-question timer.</p></div>
      </div>
    </section>

    <section className="card card-pad stack"><div className="row between"><div><h2 className="card-title">Sections</h2><p className="sub">Each section has its own timer. Students cannot go back once a section ends.</p></div>
      <span className={`pill ${over ? "pill-bad" : "pill-ok"}`}>{sum} of {f.minutes} min used</span></div>
      {secs.map((s, i) => <div key={i} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>{i === 0 && <label className="label">Section name</label>}<input className="input" placeholder={`Section ${i + 1} name, e.g. Coding Decoding`} value={s.name} onChange={(e) => upd(i, { name: e.target.value })} /></div>
        <div style={{ width: 130 }}>{i === 0 && <label className="label">Minutes</label>}<input className="input" type="number" min={1} value={s.minutes} onChange={(e) => upd(i, { minutes: e.target.value === "" ? ("" as any) : +e.target.value })} /></div>
        <button className="btn icon-btn btn-danger" disabled={secs.length === 1} onClick={() => setSecs(secs.filter((_, j) => j !== i))} aria-label="Remove section"><Trash2 size={16} /></button></div>)}
      <div><button className="btn btn-sm" onClick={() => setSecs([...secs, { name: "", minutes: 15 }])}><Plus size={15} />Add section</button></div>
      {over && <div className="alert alert-bad"><TriangleAlert size={17} />Section minutes add up to more than the total test time. Increase the total time or reduce a section.</div>}
    </section>

    <details className="card card-pad"><summary style={{ cursor: "pointer", fontWeight: 700 }}>Advanced rules <span className="sub">(optional, defaults are fine)</span></summary>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <Toggle label="Shuffle questions" hint="Different order for each student" v={f.shuffleQuestions} set={(b) => set("shuffleQuestions", b)} />
        <Toggle label="Shuffle options" hint="Mix A, B, C, D order" v={f.shuffleOptions} set={(b) => set("shuffleOptions", b)} />
        <Toggle label="Require full screen" hint="Ask students to stay in full screen" v={f.requireFullscreen} set={(b) => set("requireFullscreen", b)} />
        <Toggle label="Show result after submit" hint="Score and analysis" v={f.showResult} set={(b) => set("showResult", b)} />
        <Toggle label="Show explanations" hint="In answer review" v={f.showExplanations} set={(b) => set("showExplanations", b)} />
        <Toggle label="Leaderboard" hint="Top scorers list" v={f.leaderboard} set={(b) => set("leaderboard", b)} />
        <Toggle label="Allow untimed practice" hint="Students can choose Practice mode without a countdown" v={f.allowPracticeMode} set={(b) => set("allowPracticeMode", b)} />
        <div><label className="label">Maximum exam attempts</label><input className="input" type="number" min={1} value={f.maxAttempts} placeholder="Unlimited" onChange={num("maxAttempts")} /><p className="hint">Practice attempts do not consume this limit.</p></div>
        <div><label className="label">Allowed tab switches</label><input className="input" type="number" min={0} value={f.maxTabSwitches} onChange={num("maxTabSwitches")} /><p className="hint">The test auto-submits after this many.</p></div></div></details>

    <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>{busy ? "Creating..." : "Create test and add questions"}</button></div>
  </div>;
}

/* ---------------------------------------------------------------- manage */
function Manage({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(test.sections.some((s: any) => s._count.questions) ? 2 : 1);
  const total = test.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
  const secMin = Math.round(test.sections.reduce((a: number, s: any) => a + s.durationSec, 0) / 60);
  return <div className="stack fade-in">
    <section className="card card-pad"><div className="row between"><div><div className="row"><h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{test.name}</h2>{test.published ? <span className="pill pill-ok">Published</span> : <span className="pill pill-warn">Draft</span>}</div>
      <p className="sub">{test.examName}</p></div>
      <div className="meta"><span><Clock size={15} />{Math.round(test.durationSec / 60)} min total</span><span><Layers size={15} />{test.sections.length} sections ({secMin} min)</span><span><FileText size={15} />{total} questions</span></div></div></section>
    <SettingsPanel test={test} reload={reload} flash={flash} />
    <StructurePanel key={test.sections.map((x: any) => `${x.id}${x.name}${x.durationSec}${x._count.questions}`).join("|") + test.name + test.durationSec} test={test} reload={reload} flash={flash} />
    <div className="steps" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
      <button className={`step ${step === 1 ? "on" : ""} ${total ? "done" : ""}`} onClick={() => setStep(1)}><span className="step-n">{total ? <Check size={16} /> : 1}</span><span><b>Add questions</b><small>Paste, preview, approve</small></span></button>
      <button className={`step ${step === 2 ? "on" : ""} ${test.published ? "done" : ""}`} onClick={() => setStep(2)}><span className="step-n">{test.published ? <Check size={16} /> : 2}</span><span><b>Verify and publish</b><small>Make it live for students</small></span></button>
      <button className={`step ${step === 3 ? "on" : ""}`} onClick={() => setStep(3)}><span className="step-n"><Pencil size={15} /></span><span><b>Manage questions</b><small>Edit, delete, auto-tag</small></span></button></div>
    {step === 1 ? <AddQuestions test={test} reload={reload} flash={flash} goPublish={() => setStep(2)} /> : step === 2 ? <Publish test={test} reload={reload} flash={flash} /> : <QuestionManager test={test} reload={reload} flash={flash} />}
  </div>;
}

function SettingsPanel({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [f, setF] = useState({
    passingPercent: test.passingPercent, positiveMarks: test.positiveMarks, negativeMarks: test.negativeMarks,
    globalQuestionSec: test.globalQuestionSec ?? "", maxAttempts: test.maxAttempts ?? "",
    maxTabSwitches: test.maxTabSwitches, requireFullscreen: test.requireFullscreen, showResult: test.showResult,
    showExplanations: test.showExplanations, leaderboard: test.leaderboard, allowPracticeMode: test.allowPracticeMode,
    shuffleQuestions: test.shuffleQuestions, shuffleOptions: test.shuffleOptions,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const num = (k: string) => (e: any) => set(k, e.target.value === "" ? "" : +e.target.value);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/tests/${test.id}`, "PUT", { ...f, globalQuestionSec: f.globalQuestionSec === "" ? null : +f.globalQuestionSec, maxAttempts: f.maxAttempts === "" ? null : +f.maxAttempts });
      flash("ok", "Exam settings updated."); reload();
    } catch (e: any) { flash("bad", e.message); } finally { setBusy(false); }
  };
  const unpublish = async () => {
    try { await api(`/tests/${test.id}/unpublish`, "POST"); flash("ok", "Test moved back to draft."); reload(); } catch (e: any) { flash("bad", e.message); }
  };
  return <details className="card card-pad">
    <summary className="settings-summary"><span><b>Exam settings</b><small>Scoring, attempts, practice mode, security and visibility</small></span><Settings2 size={18} /></summary>
    <div className="form-grid" style={{ marginTop: 18 }}>
      <div><label className="label">Correct marks</label><input className="input" type="number" min={0} step="0.25" value={f.positiveMarks} onChange={(e) => set("positiveMarks", +e.target.value)} /></div>
      <div><label className="label">Negative marks</label><input className="input" type="number" min={0} step="0.05" value={f.negativeMarks} onChange={(e) => set("negativeMarks", +e.target.value)} /></div>
      <div><label className="label">Passing percentage</label><input className="input" type="number" min={0} max={100} value={f.passingPercent} onChange={(e) => set("passingPercent", +e.target.value)} /></div>
      <div><label className="label">Question timer <small>(seconds)</small></label><input className="input" type="number" min={1} placeholder="No limit" value={f.globalQuestionSec} onChange={num("globalQuestionSec")} /></div>
      <div><label className="label">Maximum exam attempts</label><input className="input" type="number" min={1} placeholder="Unlimited" value={f.maxAttempts} onChange={num("maxAttempts")} /></div>
      <div><label className="label">Allowed tab switches</label><input className="input" type="number" min={0} value={f.maxTabSwitches} onChange={(e) => set("maxTabSwitches", +e.target.value)} /></div>
      <Toggle label="Allow untimed practice" hint="Students get a separate Practice mode" v={f.allowPracticeMode} set={(b) => set("allowPracticeMode", b)} />
      <Toggle label="Shuffle questions" hint="Different order per attempt" v={f.shuffleQuestions} set={(b) => set("shuffleQuestions", b)} />
      <Toggle label="Shuffle options" hint="Mix answer order" v={f.shuffleOptions} set={(b) => set("shuffleOptions", b)} />
      <Toggle label="Require fullscreen" hint="Exam mode only" v={f.requireFullscreen} set={(b) => set("requireFullscreen", b)} />
      <Toggle label="Show result" hint="Display result after submission" v={f.showResult} set={(b) => set("showResult", b)} />
      <Toggle label="Show explanations" hint="Show explanations in review" v={f.showExplanations} set={(b) => set("showExplanations", b)} />
      <Toggle label="Leaderboard" hint="Include exam attempts" v={f.leaderboard} set={(b) => set("leaderboard", b)} />
    </div>
    <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
      {test.published && <button className="btn" onClick={unpublish}>Unpublish</button>}
      <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save settings"}</button>
    </div>
  </details>;
}

function AddQuestions({ test, reload, flash, goPublish }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void; goPublish: () => void }) {
  const [sid, setSid] = useState<string>(test.sections[0].id); const [text, setText] = useState(""); const [items, setItems] = useState<any[]>([]); const [filter, setFilter] = useState<"all" | "ok" | "bad">("all");
  const [busy, setBusy] = useState(false); const [copied, copy] = useCopy(); const [topic, setTopic] = useState(""); const [count, setCount] = useState(20);
  const sec = test.sections.find((s: any) => s.id === sid);
  const ok = (q: any) => q.errors.length === 0 && q.correctKey; const good = items.filter(ok).length;
  const prompt = useMemo(() => buildPrompt(count, topic, sec?.name ?? ""), [count, topic, sec]);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e: any) { flash("bad", e.message); } finally { setBusy(false); } };
  const preview = () => run(async () => { if (!text.trim()) throw new Error("Paste some questions first."); const r = await api("/questions/import/preview", "POST", { text }); if (!r.length) throw new Error("No questions found. Each question must start with 'Question 1.' or '1.'"); setItems(r); setFilter("all"); });
  const fix = (i: number, key: string) => setItems(items.map((q, j) => j === i ? { ...q, correctKey: key, errors: q.errors.filter((e: string) => !e.includes("Answer Detection") && !e.includes("does not exist")) } : q));
  const approve = () => run(async () => { const r = await api("/questions/import", "POST", { sectionId: sid, items: items.filter(ok) }); flash("ok", `${r.created} questions added to "${sec.name}"${r.rejected ? `, ${r.rejected} rejected` : ""}.`); setItems(items.filter((q) => !ok(q))); if (!items.some((q) => !ok(q))) setText(""); reload(); });
  const shown = items.map((q, i) => ({ q, i })).filter(({ q }) => filter === "all" || (filter === "ok" ? ok(q) : !ok(q)));

  return <div className="stack">
    <section className="card card-pad stack"><div><h2 className="card-title">1. Choose a section</h2><p className="sub">Questions you approve are added to the section you pick here. Repeat for each section.</p></div>
      <div className="row">{test.sections.map((s: any) => <button key={s.id} className={`btn ${sid === s.id ? "btn-primary" : ""}`} onClick={() => { setSid(s.id); setItems([]); }}>{s.name}<span className="pill" style={{ marginLeft: 4 }}>{s._count.questions} Qs</span></button>)}</div></section>

    <section className="card card-pad stack"><div><h2 className="card-title">2. Get questions in the right format</h2><p className="sub">Generate with any AI tool using the prompt below, or type them yourself. Copy the sample to see the exact format.</p></div>
      <div className="form-grid"><div><label className="label">Topic</label><input className="input" placeholder="e.g. Coding-Decoding for SSC CGL" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
        <div><label className="label">Number of questions</label><input className="input" type="number" min={1} max={100} value={count} onChange={(e) => setCount(+e.target.value || 1)} /></div></div>
      <pre className="textarea mono" style={{ whiteSpace: "pre-wrap", margin: 0, maxHeight: 190, overflow: "auto" }}>{prompt}</pre>
      <div className="row"><button className="btn btn-sm" onClick={() => copy("p", prompt)}>{copied === "p" ? <Check size={15} /> : <Sparkles size={15} />}{copied === "p" ? "Copied" : "Copy AI prompt"}</button>
        <button className="btn btn-sm" onClick={() => copy("s", SAMPLE)}>{copied === "s" ? <Check size={15} /> : <Copy size={15} />}{copied === "s" ? "Copied" : "Copy sample format"}</button>
        <button className="btn btn-sm" onClick={() => setText(SAMPLE)}>Fill sample in box</button></div>
      <div className="alert alert-info"><Info size={17} /><span>Every question needs <b>4 options (A to D)</b> and an <b>Answer:</b> line. Explanation, Difficulty (EASY, MEDIUM, HARD) and Topic are optional. Keep a blank line between questions.</span></div></section>

    <section className="card card-pad stack"><div><h2 className="card-title">3. Paste and preview</h2><p className="sub">Nothing is saved until you approve.</p></div>
      <textarea className="textarea mono" rows={11} placeholder="Paste your questions here" value={text} onChange={(e) => setText(e.target.value)} />
      <div><button className="btn btn-primary" onClick={preview} disabled={busy}><Upload size={16} />Check questions</button></div>
      {items.length > 0 && <>
        <div className="row between"><div className="row"><span className="pill pill-ok">{good} ready</span>{items.length - good > 0 && <span className="pill pill-bad">{items.length - good} need fixing</span>}</div>
          <div className="seg">{([["all", "All"], ["ok", "Ready"], ["bad", "Need fixing"]] as const).map(([k, l]) => <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
        <div className="stack" style={{ gap: 10 }}>{shown.map(({ q, i }) => <div key={i} className="qcard" style={{ borderColor: ok(q) ? "color-mix(in srgb,#16a34a 50%,var(--border))" : "color-mix(in srgb,#dc2626 55%,var(--border))" }}>
          <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}><div style={{ fontWeight: 700 }}>Q{q.index}. {q.text}</div>{ok(q) ? <span className="pill pill-ok">Ready</span> : <span className="pill pill-bad">Fix</span>}</div>
          {q.detected && <div className="row" style={{ gap: 6, marginTop: 6 }}><span className="tag-chip"><Wand2 size={11} />{q.detected.subjectName}</span><span className="pill">{q.detected.topic}</span><span className="sub">{Math.round(q.detected.confidence * 100)}% sure (auto-detected)</span></div>}
          <div style={{ display: "grid", gap: 5, marginTop: 8 }}>{q.options.map((o: any) => <div key={o.key} className="row" style={{ flexWrap: "nowrap", color: q.correctKey === o.key ? "var(--ok)" : undefined, fontWeight: q.correctKey === o.key ? 700 : 500, fontSize: ".9rem" }}>
            <span style={{ width: 22 }}>{o.key}.</span><span>{o.text}</span>{q.correctKey === o.key && <Check size={15} />}</div>)}</div>
          {q.errors.map((e: string) => <div key={e} className="alert alert-bad" style={{ marginTop: 8, padding: "8px 11px" }}><TriangleAlert size={15} />{e}</div>)}
          {!q.correctKey && q.options.length > 0 && <div className="row" style={{ marginTop: 10 }}><span className="sub">Pick the correct answer:</span>{q.options.map((o: any) => <button key={o.key} className="btn btn-sm" onClick={() => fix(i, o.key)}>{o.key}</button>)}</div>}
        </div>)}</div>
        {good > 0 && <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn btn-ok btn-lg" onClick={approve} disabled={busy}><Check size={18} />Add {good} question{good > 1 ? "s" : ""} to {sec.name}</button></div>}
      </>}
    </section>
    <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={goPublish}>Next: verify and publish<ListChecks size={16} /></button></div>
  </div>;
}

function Publish({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [busy, setBusy] = useState(false); const [problems, setProblems] = useState<string[]>([]); const [copied, copy] = useCopy();
  const secMin = test.sections.reduce((a: number, s: any) => a + s.durationSec, 0); const timeOk = secMin <= test.durationSec; const allHave = test.sections.every((s: any) => s._count.questions > 0);
  const link = `${location.origin}/login?test=${test.id}`;
  const go = async () => {
    setBusy(true); setProblems([]);
    try { await api("/questions/verify", "POST", { testId: test.id }); await api(`/tests/${test.id}/publish`, "POST"); flash("ok", "Published. Students can now see this test."); reload(); }
    catch (e: any) { setProblems(String(e.message).split("; ")); } finally { setBusy(false); }
  };
  const row = (okk: boolean, title: string, sub: string) => <div className="row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>{okk ? <CircleCheck size={20} color="#16a34a" style={{ flex: "none" }} /> : <CircleX size={20} color="#dc2626" style={{ flex: "none" }} />}<div><b>{title}</b><div className="sub">{sub}</div></div></div>;
  return <div className="stack">
    <section className="card card-pad stack"><div><h2 className="card-title">Checklist</h2><p className="sub">Everything here must be green before you publish.</p></div>
      {test.sections.map((s: any) => <div key={s.id}>{row(s._count.questions > 0, s.name, `${s._count.questions} questions, ${Math.round(s.durationSec / 60)} min`)}</div>)}
      {row(timeOk, "Section time fits the test time", `Sections total ${Math.round(secMin / 60)} min, test time is ${Math.round(test.durationSec / 60)} min`)}
      {!allHave && <div className="alert alert-warn"><TriangleAlert size={17} />Some sections have no questions yet. Go back to "Add questions".</div>}
      {problems.length > 0 && <div className="alert alert-bad"><TriangleAlert size={17} /><div><b>Could not publish</b><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul></div></div>}
      <div><button className="btn btn-ok btn-lg" onClick={go} disabled={busy || !allHave || !timeOk}><Rocket size={18} />{test.published ? "Re-verify new questions" : busy ? "Publishing..." : "Verify all and publish"}</button>
        <p className="hint">Verifying marks all pending questions as checked. Please make sure you have reviewed the answers.</p></div></section>
    {test.published && <section className="card card-pad stack"><div><h2 className="card-title">Share with students</h2><p className="sub">Students who open this link log in and land directly on this test.</p></div>
      <div className="row" style={{ flexWrap: "nowrap" }}><input className="input mono" readOnly value={link} onFocus={(e) => e.target.select()} /><button className="btn" onClick={() => copy("l", link)}>{copied === "l" ? <Check size={16} /> : <LinkIcon size={16} />}{copied === "l" ? "Copied" : "Copy"}</button></div>
      <Link className="btn btn-sm" style={{ width: "fit-content" }} to={`/exam/${test.id}`}>Try the test yourself</Link></section>}
  </div>;
}


/* ---------------------------------------------------------------- structure: name/time/sections/reset */
function StructurePanel({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [f, setF] = useState({ name: test.name, examName: test.examName, description: test.description ?? "", minutes: Math.round(test.durationSec / 60), difficulty: test.difficulty });
  const [secs, setSecs] = useState<any[]>(test.sections.map((s: any) => ({ id: s.id, name: s.name, minutes: Math.round(s.durationSec / 60), n: s._count.questions })));
  const [stats, setStats] = useState<any>(null); const [busy, setBusy] = useState(false); const [askReset, setAskReset] = useState(false);
  useEffect(() => { api(`/tests/${test.id}/analytics`).then(setStats).catch(() => {}); }, [test.id]);
  const run = async (fn: () => Promise<any>, ok: string) => { setBusy(true); try { await fn(); flash("ok", ok); reload(); } catch (e: any) { flash("bad", e.message); } finally { setBusy(false); } };
  const saveBasics = () => run(() => api(`/tests/${test.id}`, "PUT", { name: f.name.trim(), examName: f.examName.trim(), description: f.description.trim() || undefined, durationSec: Math.round(+f.minutes * 60), difficulty: f.difficulty }), "Test details saved.");
  const saveSec = (s: any) => run(() => api(`/tests/${test.id}/sections/${s.id}`, "PUT", { name: s.name.trim(), durationSec: Math.round(+s.minutes * 60) }), `Section "${s.name}" saved.`);
  const delSec = (s: any) => run(() => api(`/tests/${test.id}/sections/${s.id}`, "DELETE"), `Section "${s.name}" removed.`);
  const addSec = () => run(() => api(`/tests/${test.id}/sections`, "POST", { name: `Section ${secs.length + 1}`, durationSec: 15 * 60 }), "Section added.");
  const reset = () => run(async () => { const r = await api(`/tests/${test.id}/reset-attempts`, "POST"); setAskReset(false); flash("ok", `Deleted ${r.deleted} student attempts.`); }, "Attempts reset.");
  return <details className="card card-pad"><summary className="settings-summary"><span><b>Name, timing and sections</b><small>Rename the test, change section times, add or remove sections, reset student attempts</small></span><Settings2 size={18} /></summary>
    <div className="stack" style={{ marginTop: 18 }}>
      {stats && stats.attempts > 0 && <div className="grid-stats"><div className="stat"><div className="stat-l">Official attempts</div><div className="stat-v">{stats.attempts}</div></div><div className="stat"><div className="stat-l">Avg score</div><div className="stat-v">{stats.avgPercentage}%</div></div><div className="stat"><div className="stat-l">Pass rate</div><div className="stat-v">{stats.passRate}%</div></div><div className="stat"><div className="stat-l">Avg time</div><div className="stat-v">{fmt(stats.avgTimeSec)}</div></div></div>}
      <div className="form-grid"><div><label className="label">Test name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div><div><label className="label">Exam name</label><input className="input" value={f.examName} onChange={(e) => setF({ ...f, examName: e.target.value })} /></div>
        <div><label className="label">Total time (min)</label><input className="input" type="number" min={1} value={f.minutes} onChange={(e) => setF({ ...f, minutes: +e.target.value })} /></div>
        <div><label className="label">Difficulty</label><select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></div></div>
      <div><label className="label">Description</label><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div><button className="btn btn-primary btn-sm" disabled={busy} onClick={saveBasics}><Save size={14} />Save details</button></div>
      <div className="stack" style={{ gap: 8 }}><b>Sections</b>{secs.map((s, i) => <div key={s.id} className="row" style={{ flexWrap: "nowrap" }}><input className="input" value={s.name} onChange={(e) => setSecs(secs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /><input className="input" type="number" min={1} style={{ width: 100 }} value={s.minutes} onChange={(e) => setSecs(secs.map((x, j) => j === i ? { ...x, minutes: +e.target.value } : x))} /><span className="sub" style={{ whiteSpace: "nowrap" }}>min · {s.n} Q</span>
        <button className="btn btn-sm" disabled={busy} onClick={() => saveSec(s)}><Save size={14} /></button><button className="btn btn-sm btn-danger" disabled={busy || secs.length < 2} title="Remove (must be empty)" onClick={() => delSec(s)}><Trash2 size={14} /></button></div>)}
        <div><button className="btn btn-sm" disabled={busy} onClick={addSec}><Plus size={14} />Add section</button></div></div>
      <div className="alert alert-warn" style={{ alignItems: "center" }}><TriangleAlert size={16} /><span style={{ flex: 1 }}>Reset removes every student's attempts, results and leaderboard entries for this test, but keeps the test and its questions.</span><button className="btn btn-sm btn-danger" onClick={() => setAskReset(true)}><RotateCcw size={14} />Reset attempts</button></div>
    </div>
    {askReset && <div className="modal-bg" onClick={() => setAskReset(false)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}><h3 className="card-title">Reset all attempts of "{test.name}"?</h3><p className="sub">This cannot be undone.</p><div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setAskReset(false)}>Cancel</button><button className="btn btn-danger" onClick={reset}>Reset</button></div></div></div>}
  </details>;
}

/* ---------------------------------------------------------------- question manager */
function QuestionManager({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [data, setData] = useState<any[] | null>(null); const [subjects, setSubjects] = useState<any[]>([]); const [sec, setSec] = useState("ALL"); const [q, setQ] = useState(""); const [edit, setEdit] = useState<any>(null); const [del, setDel] = useState<any>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api(`/tests/${test.id}/questions`).then(setData).catch((e) => flash("bad", e.message)), [test.id]); // eslint-disable-line
  useEffect(() => { load(); api("/coach/exams").then((r) => setSubjects(r.subjects)).catch(() => {}); }, [load]);
  const autotag = async (force: boolean) => { setBusy(true); try { const r = await api("/questions/autotag", "POST", { testId: test.id, force }); flash("ok", `Auto-detected tags for ${r.total} questions (${r.changed} updated). ${Object.entries(r.summary).map(([k, v]) => `${k}: ${v}`).join(" · ")}`); load(); } catch (e: any) { flash("bad", e.message); } finally { setBusy(false); } };
  const save = async () => {
    setBusy(true);
    try { await api(`/questions/${edit.id}`, "PUT", { text: edit.text, explanation: edit.explanation || null, subject: edit.subject || null, topic: edit.topic || null, difficulty: edit.difficulty, correctKey: edit.correctKey, options: edit.options.map((o: any) => ({ key: o.key, text: o.text })) }); flash("ok", "Question updated."); setEdit(null); load(); }
    catch (e: any) { flash("bad", e.message); } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { const r = await api(`/questions/${del.id}`, "DELETE"); flash("ok", r.detached ? "Question removed from the test (students' history is preserved)." : "Question deleted."); setDel(null); load(); reload(); } catch (e: any) { flash("bad", e.message); } finally { setBusy(false); } };
  if (!data) return <Loading />;
  const needle = q.trim().toLowerCase();
  return <div className="stack">
    <section className="card card-pad stack"><div className="row between"><div><h2 className="card-title">Manage questions</h2><p className="sub">Fix wrong answers, change topics, delete bad questions. Auto-tag detects subject and topic for every question so Smart Coach can rate students out of 100.</p></div>
      <div className="row"><button className="btn btn-sm" disabled={busy} onClick={() => autotag(false)}><Wand2 size={14} />Auto-tag missing</button><button className="btn btn-sm" disabled={busy} onClick={() => { if (window.confirm("Re-detect subject and topic for ALL questions, replacing existing tags?")) autotag(true); }}>Re-tag all</button></div></div>
      <div className="row"><div className="seg" style={{ maxWidth: "100%", overflowX: "auto" }}><button className={sec === "ALL" ? "on" : ""} onClick={() => setSec("ALL")}>All</button>{data.map((s) => <button key={s.id} className={sec === s.id ? "on" : ""} onClick={() => setSec(s.id)}>{s.name} ({s.questions.length})</button>)}</div>
        <div style={{ position: "relative", minWidth: 220, flex: 1 }}><Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} /><input className="input" style={{ paddingLeft: 36 }} placeholder="Search question text or topic" value={q} onChange={(e) => setQ(e.target.value)} /></div></div></section>
    {data.filter((s) => sec === "ALL" || s.id === sec).map((s) => <section key={s.id} className="stack" style={{ gap: 10 }}><h3 className="card-title">{s.name} <span className="pill">{s.questions.length}</span></h3>
      {s.questions.filter((x: any) => !needle || `${x.text} ${x.topic ?? ""}`.toLowerCase().includes(needle)).map((x: any, i: number) => <div key={x.id} className="qcard">
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}><div style={{ fontWeight: 700 }}>{i + 1}. {x.text}</div><div className="row" style={{ flexWrap: "nowrap", gap: 6 }}><button className="btn btn-sm" onClick={() => setEdit({ ...x, options: [...x.options].sort((a: any, b: any) => a.key.localeCompare(b.key)) })}><Pencil size={14} />Edit</button><button className="btn btn-sm btn-danger" onClick={() => setDel(x)}><Trash2 size={14} /></button></div></div>
        <div style={{ display: "grid", gap: 3, marginTop: 6, fontSize: ".88rem" }}>{x.options.map((o: any) => <div key={o.key} style={{ color: o.key === x.correctKey ? "var(--ok)" : undefined, fontWeight: o.key === x.correctKey ? 700 : 500 }}>{o.key}. {o.text}{o.key === x.correctKey && " ✓"}</div>)}</div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>{x.subject ? <span className="tag-chip">{subjects.find((z) => z.key === x.subject)?.name ?? x.subject}</span> : <span className="pill pill-warn">no subject</span>}{x.topic ? <span className="pill">{x.topic}</span> : <span className="pill pill-warn">no topic</span>}<span className="pill">{x.difficulty.toLowerCase()}</span>
          {x.analytics && <span className={`pill ${x.analytics.attempts >= 5 && x.analytics.correctPct < 20 ? "pill-bad" : ""}`}>{x.analytics.correctPct}% correct · {x.analytics.attempts} attempts · {x.analytics.avgSec}s{x.analytics.attempts >= 5 && x.analytics.correctPct < 20 ? " · check the answer key!" : ""}</span>}</div></div>)}</section>)}
    {edit && <div className="modal-bg" onClick={() => !busy && setEdit(null)}><div className="card modal stack" style={{ gap: 10, maxWidth: 640, maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title">Edit question</h3>
      <textarea className="textarea" rows={3} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
      {edit.options.map((o: any, i: number) => <div key={o.key} className="row" style={{ flexWrap: "nowrap" }}><label className="row" style={{ gap: 6, flexWrap: "nowrap", width: 70 }}><input type="radio" name="ck" checked={edit.correctKey === o.key} onChange={() => setEdit({ ...edit, correctKey: o.key })} /><b>{o.key}</b></label><input className="input" value={o.text} onChange={(e) => setEdit({ ...edit, options: edit.options.map((z: any, j: number) => j === i ? { ...z, text: e.target.value } : z) })} /></div>)}
      <p className="hint">Select the radio next to the correct option.</p>
      <div className="form-grid"><div><label className="label">Subject</label><select className="input" value={edit.subject ?? ""} onChange={(e) => setEdit({ ...edit, subject: e.target.value })}><option value="">(auto)</option>{subjects.map((z) => <option key={z.key} value={z.key}>{z.name}</option>)}</select></div>
        <div><label className="label">Topic</label><input className="input" value={edit.topic ?? ""} onChange={(e) => setEdit({ ...edit, topic: e.target.value })} /></div>
        <div><label className="label">Difficulty</label><select className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value })}><option>EASY</option><option>MEDIUM</option><option>HARD</option></select></div></div>
      <div><label className="label">Explanation</label><textarea className="textarea" rows={2} value={edit.explanation ?? ""} onChange={(e) => setEdit({ ...edit, explanation: e.target.value })} /></div>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busy} onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={save}><Save size={15} />Save</button></div></div></div>}
    {del && <div className="modal-bg" onClick={() => setDel(null)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}><h3 className="card-title">Delete this question?</h3><p className="sub">{del.text.slice(0, 140)}</p><p className="sub">If students already answered it, it is removed from the test but their history stays intact.</p><div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={remove}><Trash2 size={15} />Delete</button></div></div></div>}
  </div>;
}
