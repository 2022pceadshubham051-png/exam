import { useCallback, useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { Plus, Trash2, Copy, Check, CircleCheck, CircleX, TriangleAlert, ArrowLeft, FileText, Layers, Clock, Rocket, Upload, ListChecks, Settings2, Link as LinkIcon, Sparkles, Info, X } from "lucide-react";
import { api } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

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
  shuffleQuestions: false, shuffleOptions: false, requireFullscreen: true, showResult: true, showExplanations: true, leaderboard: true };

export default function Admin() {
  const [list, setList] = useState<any[] | null>(null); const [test, setTest] = useState<any>(null); const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "bad" | "info"; m: string } | null>(null); const [del, setDel] = useState<any>(null);
  const flash = (t: "ok" | "bad" | "info", m: string) => { setMsg({ t, m }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const loadList = useCallback(() => api("/tests").then(setList).catch((e) => flash("bad", e.message)), []);
  const open = useCallback(async (id: string) => { try { setTest(await api(`/tests/${id}`)); setCreating(false); setMsg(null); } catch (e: any) { flash("bad", e.message); } }, []);
  useEffect(() => { loadList(); }, [loadList]);
  const back = () => { setTest(null); setCreating(false); setMsg(null); loadList(); };
  const remove = async () => { try { await api(`/tests/${del.id}`, "DELETE"); setDel(null); flash("ok", "Test deleted."); loadList(); } catch (e: any) { setDel(null); flash("bad", e.message); } };
  const totalQ = (t: any) => t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);

  return <Shell>
    <div className="stack">
      <div className="row between">
        <div><h1 style={{ fontSize: "1.7rem", fontWeight: 800 }}>Admin Studio</h1><p className="sub">Create tests, add questions and publish them to students.</p></div>
        {(test || creating) ? <button className="btn" onClick={back}><ArrowLeft size={16} />All tests</button> : <button className="btn btn-primary" onClick={() => { setCreating(true); setMsg(null); }}><Plus size={16} />New test</button>}
      </div>
      {msg && <div className={`alert alert-${msg.t === "info" ? "info" : msg.t}`}>{msg.t === "ok" ? <CircleCheck size={18} /> : msg.t === "bad" ? <CircleX size={18} /> : <Info size={18} />}<span style={{ flex: 1 }}>{msg.m}</span><button className="btn-ghost btn btn-sm" onClick={() => setMsg(null)}><X size={14} /></button></div>}

      {creating && <CreateTest onCreated={(t) => { flash("ok", "Test created. Now add questions."); open(t.id); }} onError={(m) => flash("bad", m)} />}
      {test && <Manage key={test.id} test={test} reload={() => open(test.id)} flash={flash} />}

      {!test && !creating && <>
        {!list ? <Loading /> : list.length ? <div className="grid-auto">{list.map((t) => <article key={t.id} className="card tcard">
          <div className="row between"><span className="pill pill-brand">{t.examName}</span>{t.published ? <span className="pill pill-ok">Published</span> : <span className="pill pill-warn">Draft</span>}</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>{t.name}</h3>
          <div className="meta"><span><Clock size={15} />{Math.round(t.durationSec / 60)} min</span><span><FileText size={15} />{totalQ(t)} questions</span><span><Layers size={15} />{t.sections.length} sections</span></div>
          <div className="row" style={{ marginTop: "auto" }}><button className="btn btn-primary btn-sm" onClick={() => open(t.id)}><Settings2 size={15} />Manage</button>
            <button className="btn btn-danger btn-sm" onClick={() => setDel(t)}><Trash2 size={15} />Delete</button></div></article>)}</div>
          : <div className="card empty"><FileText size={36} /><p>You have not created any test yet.</p><button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setCreating(true)}><Plus size={16} />Create your first test</button></div>}
      </>}
    </div>
    {del && <div className="modal-bg" onClick={() => setDel(null)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title">Delete "{del.name}"?</h3><p className="sub">This removes the test and its sections. A test that students have already attempted cannot be deleted.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}><Trash2 size={15} />Delete</button></div></div></div>}
  </Shell>;
}

function Toggle({ label, hint, v, set }: { label: string; hint: string; v: boolean; set: (b: boolean) => void }) {
  return <label className="switch"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /><span>{label}<small>{hint}</small></span></label>;
}

/* ---------------------------------------------------------------- create */
function CreateTest({ onCreated, onError }: { onCreated: (t: any) => void; onError: (m: string) => void }) {
  const [f, setF] = useState<any>(defaults); const [secs, setSecs] = useState<Sec[]>([{ name: "", minutes: 20 }]); const [busy, setBusy] = useState(false);
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
        shuffleQuestions: f.shuffleQuestions, shuffleOptions: f.shuffleOptions, requireFullscreen: f.requireFullscreen, showResult: f.showResult, showExplanations: f.showExplanations, leaderboard: f.leaderboard,
        sections: secs.map((s) => ({ name: s.name.trim(), durationSec: Math.round(+s.minutes * 60) })) });
      onCreated(t);
    } catch (e: any) { onError(e.message); } finally { setBusy(false); }
  };
  return <div className="stack fade-in">
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
        <div><label className="label">Passing percentage</label><input className="input" type="number" min={0} max={100} value={f.passingPercent} onChange={num("passingPercent")} /></div></div>
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
        <div><label className="label">Allowed tab switches</label><input className="input" type="number" min={0} value={f.maxTabSwitches} onChange={num("maxTabSwitches")} /><p className="hint">The test auto-submits after this many.</p></div></div></details>

    <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn btn-primary btn-lg" onClick={submit} disabled={busy}>{busy ? "Creating..." : "Create test and add questions"}</button></div>
  </div>;
}

/* ---------------------------------------------------------------- manage */
function Manage({ test, reload, flash }: { test: any; reload: () => void; flash: (t: "ok" | "bad" | "info", m: string) => void }) {
  const [step, setStep] = useState<1 | 2>(test.sections.some((s: any) => s._count.questions) ? 2 : 1);
  const total = test.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
  const secMin = Math.round(test.sections.reduce((a: number, s: any) => a + s.durationSec, 0) / 60);
  return <div className="stack fade-in">
    <section className="card card-pad"><div className="row between"><div><div className="row"><h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{test.name}</h2>{test.published ? <span className="pill pill-ok">Published</span> : <span className="pill pill-warn">Draft</span>}</div>
      <p className="sub">{test.examName}</p></div>
      <div className="meta"><span><Clock size={15} />{Math.round(test.durationSec / 60)} min total</span><span><Layers size={15} />{test.sections.length} sections ({secMin} min)</span><span><FileText size={15} />{total} questions</span></div></div></section>
    <div className="steps" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
      <button className={`step ${step === 1 ? "on" : ""} ${total ? "done" : ""}`} onClick={() => setStep(1)}><span className="step-n">{total ? <Check size={16} /> : 1}</span><span><b>Add questions</b><small>Paste, preview, approve</small></span></button>
      <button className={`step ${step === 2 ? "on" : ""} ${test.published ? "done" : ""}`} onClick={() => setStep(2)}><span className="step-n">{test.published ? <Check size={16} /> : 2}</span><span><b>Verify and publish</b><small>Make it live for students</small></span></button></div>
    {step === 1 ? <AddQuestions test={test} reload={reload} flash={flash} goPublish={() => setStep(2)} /> : <Publish test={test} reload={reload} flash={flash} />}
  </div>;
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
