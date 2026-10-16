import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Search, Clock, FileText, Play, Target, Trophy, ClipboardList, ArrowRight, Eye, SlidersHorizontal, Trash2, Compass, X, TriangleAlert, CircleCheck } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell"; import AdSlot from "../components/AdSlot"; import { loadProfile, matchesExam, firstName, type Profile } from "../lib/profile";
import { showLevelUp } from "../components/LevelUp"; import { levelFromXp, xpFromAttempts, streakDays, saveLevel, savedLevel, saveXp } from "../lib/game";

const diff: Record<string, string> = { EASY: "pill-ok", MEDIUM: "pill-warn", HARD: "pill-bad" };
export default function Dashboard() {
  const [prof, setProf] = useState<Profile | null>(null); const [scope, setScope] = useState<"mine" | "all">("mine");
  useEffect(() => { loadProfile().then(setProf).catch(() => {}); }, []);
  const [tests, setTests] = useState<any[] | null>(null); const [hist, setHist] = useState<any[]>([]); const [q, setQ] = useState(""); const mode = "all" as "all" | "practice" | "timed"; const [diffFilter, setDiffFilter] = useState("ALL"); const [err, setErr] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set()); const [histMode, setHistMode] = useState<"all" | "EXAM" | "PRACTICE">("all"); const [histTest, setHistTest] = useState("ALL"); const [ask, setAsk] = useState<null | { title: string; body: any; label: string }>(null); const [note, setNote] = useState<null | { ok: boolean; m: string }>(null); const [busyDel, setBusyDel] = useState(false);
  const loadHist = () => api("/history").then((data) => setHist(Array.isArray(data) ? data : [])).catch(() => setHist([]));
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setTests(null);
      api(`/tests?limit=100&q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (cancelled) return;
          if (!Array.isArray(data)) throw new Error("Unexpected response from the tests API.");
          setTests(data);
          setErr("");
        })
        .catch((e) => {
          if (cancelled) return;
          setTests([]);
          setErr(e instanceof Error ? e.message : "Unable to load tests.");
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    api("/history")
      .then((data) => { if (!cancelled) setHist(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setHist([]); });
    return () => { cancelled = true; };
  }, []);

  const done = hist.filter((a) => a.result); const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const target = prof?.targetExam ?? null, fn = firstName(prof);
  const mineAll = (tests ?? []).filter((t) => matchesExam(t.examName, target)), useMine = !!target && scope === "mine" && mineAll.length > 0;
  const shownTests = [...(useMine ? mineAll : tests ?? [])].sort((a, b) => Number(!matchesExam(a.examName, target)) - Number(!matchesExam(b.examName, target))).filter((t) => (diffFilter === "ALL" || t.difficulty === diffFilter) && (mode === "all" || (mode === "practice" ? t.allowPracticeMode !== false : true)));
  const shownHist = hist.filter((a) => (histMode === "all" || a.mode === histMode) && (histTest === "ALL" || a.test.id === histTest));
  const doDelete = async () => {
    if (!ask) return; setBusyDel(true);
    try { const r = await api("/history/delete", "POST", ask.body); setNote({ ok: true, m: `Deleted ${r.deleted} attempt${r.deleted === 1 ? "" : "s"}.${r.skipped ? ` ${r.skipped} official attempt(s) were kept because their test has an attempt limit.` : ""}` }); setSel(new Set()); await loadHist(); }
    catch (e: any) { setNote({ ok: false, m: e.message }); } finally { setBusyDel(false); setAsk(null); }
  };
  const xp = xpFromAttempts(done), lv = levelFromXp(xp), streak = streakDays(done);
  useEffect(() => { if (!hist.length) return; const prev = savedLevel(); if (prev && lv.level > prev) showLevelUp(lv.level, lv.title); saveLevel(lv.level); saveXp(xp); }, [lv.level, hist.length]); // eslint-disable-line
  const best = done.length ? Math.max(...done.map((a) => a.result.percentage)) : null;
  const [showAll, setShowAll] = useState(false);
  const active = hist.find((a) => !a.result && !a.resultHidden);
  const recent = hist.slice(0, 5);
  const next = shownTests[0];
  return <Shell>
    <div className="stack" style={{ gap: 28 }}>
      <section className="dash-top">
        <div>
          <h1>{done.length ? `Welcome back${fn ? `, ${fn}` : ""}` : `Hi${fn ? `, ${fn}` : ""} 👋`}</h1>
          <p className="sub">{target ? `Preparing for ${target}${prof?.targetScore ? ` · goal ${prof.targetScore}%` : ""}` : "Pick a test below and start practising."}</p>
        </div>
        <div className="dash-chips"><span className="pill pill-brand">Lv {lv.level}</span>{streak > 0 && <span className="pill pill-warn">🔥 {streak}-day streak</span>}</div>
      </section>

      {active ? <section className="next-card">
        <div><span className="pill pill-warn">In progress</span><h2>{active.test.name}</h2><p className="sub">You left this {active.mode === "PRACTICE" ? "practice session" : "test"} unfinished. Your answers are saved.</p></div>
        <Link className="btn btn-primary btn-lg" to={`/exam/${active.test.id}`}><Play size={18} />Continue</Link>
      </section> : next ? <section className="next-card">
        <div><span className="pill pill-brand">{done.length ? "Suggested next" : "Start here"}</span><h2>{next.name}</h2><p className="sub">{next.examName} · {fmt(next.durationSec)} · {next.sections.reduce((a: number, s: any) => a + s._count.questions, 0)} questions</p></div>
        <Link className="btn btn-primary btn-lg" to={`/exam/${next.id}`}><Play size={18} />{done.length ? "Start test" : "Take your first test"}</Link>
      </section> : null}

      {done.length > 0 && <section className="grid-stats">
        <div className="stat"><div className="stat-l"><ClipboardList size={14} />Tests taken</div><div className="stat-v">{done.length}</div></div>
        <div className="stat"><div className="stat-l"><Target size={14} />Average score</div><div className="stat-v">{avg === null ? "-" : `${avg}%`}</div></div>
        <div className="stat"><div className="stat-l"><Trophy size={14} />Best score</div><div className="stat-v">{best === null ? "-" : `${best}%`}</div></div>
      </section>}

      <section className="stack" id="tests" style={{ gap: 14 }}>
        <div className="row between"><h2 className="section-h">All tests</h2><Link className="btn btn-sm btn-ghost" to="/coach"><Compass size={14} />Not sure what to practise?</Link></div>
        <div className="filter-bar">
          <div className="search"><Search size={16} /><input className="input" placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" /></div>
          {target && mineAll.length > 0 && <div className="seg"><button className={scope === "mine" ? "on" : ""} onClick={() => setScope("mine")}>{target}</button><button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All exams</button></div>}
          <select className="input" value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} aria-label="Filter by difficulty"><option value="ALL">Any level</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
        </div>
        {target && tests && mineAll.length === 0 && <div className="alert alert-info">No {target} tests yet, so you are seeing every test.</div>}
        {err && <div className="alert alert-bad">{err}</div>}
        {!tests ? <Loading /> : shownTests.length ? <div className="grid-auto">{shownTests.map((t) => {
          const qs = t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
          return <Link key={t.id} to={`/exam/${t.id}`} className="card tcard tcard-simple">
            <div className="row between"><span className="pill pill-brand">{t.examName}</span><span className={`pill ${diff[t.difficulty] ?? ""}`}>{t.difficulty.toLowerCase()}</span></div>
            <h3>{t.name}</h3>
            <div className="meta"><span><Clock size={15} />{fmt(t.durationSec)}</span><span><FileText size={15} />{qs} questions</span></div>
            <span className="tcard-go">Open<ArrowRight size={15} /></span>
          </Link>; })}</div>
          : <div className="card empty"><SlidersHorizontal size={34} /><p>{q || diffFilter !== "ALL" ? "No tests match your search." : "No tests are published yet. Check back soon."}</p></div>}
      </section>

      {hist.length > 0 && <section className="stack" style={{ gap: 14 }}>
        <div className="row between"><h2 className="section-h">Recent attempts</h2><button className="btn btn-sm btn-ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Show less" : "Show all & manage"}</button></div>
        {note && <div className={`alert ${note.ok ? "alert-ok" : "alert-bad"}`}>{note.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}<span style={{ flex: 1 }}>{note.m}</span><button className="btn btn-ghost btn-sm" onClick={() => setNote(null)}><X size={14} /></button></div>}
        {!showAll ? <div className="card attempt-list">{recent.map((a) => <div className="attempt-row" key={a.id}>
          <div style={{ minWidth: 0, flex: 1 }}><b className="ellipsis">{a.test.name}</b><span className="sub">{new Date(a.startedAt).toLocaleDateString()} · {a.mode === "PRACTICE" ? (a.adaptiveQuestionIds ? "Adaptive" : "Practice") : "Exam"}</span></div>
          {a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : a.resultHidden ? <span className="pill">Hidden</span> : <span className="pill pill-warn">In progress</span>}
          {a.result || a.resultHidden ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} />Result</Link> : <Link className="btn btn-sm btn-primary" to={`/exam/${a.test.id}`}>Resume</Link>}
        </div>)}</div> : <>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><div className="seg">{([["all", "All"], ["EXAM", "Exams"], ["PRACTICE", "Practice"]] as const).map(([k, l]) => <button key={k} className={histMode === k ? "on" : ""} onClick={() => { setHistMode(k); setSel(new Set()); }}>{l}</button>)}</div>
          <select className="input" style={{ width: 190 }} value={histTest} onChange={(e) => { setHistTest(e.target.value); setSel(new Set()); }} aria-label="Filter history by test"><option value="ALL">All tests</option>{[...new Map(hist.map((a) => [a.test.id, a.test.name])).entries()].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>
        {shownHist.length ? <div className="card table-wrap"><table className="t"><thead><tr><th style={{ width: 34 }}><input type="checkbox" className="hist-check" aria-label="Select all" checked={shownHist.length > 0 && shownHist.every((a) => sel.has(a.id))} onChange={(e) => setSel(e.target.checked ? new Set(shownHist.map((a) => a.id)) : new Set())} /></th><th>Test</th><th>Score</th><th>Right / Wrong / Skipped</th><th>Date</th><th /></tr></thead>
          <tbody>{shownHist.map((a) => <tr key={a.id}><td><input type="checkbox" className="hist-check" aria-label="Select attempt" checked={sel.has(a.id)} onChange={() => { const n = new Set(sel); n.has(a.id) ? n.delete(a.id) : n.add(a.id); setSel(n); }} /></td><td><b>{a.test.name}</b><div className="sub">Attempt #{a.attemptNo} · {a.mode === "PRACTICE" ? (a.adaptiveQuestionIds ? "Adaptive" : "Practice") : "Exam"}</div></td>
            <td>{a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : a.resultHidden ? <span className="pill">Hidden</span> : <span className="pill pill-warn">In progress</span>}</td>
            <td>{a.result ? `${a.result.correct} / ${a.result.incorrect} / ${a.result.unanswered}` : "-"}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td>
            <td><div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>{a.result || a.resultHidden ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} />Result</Link> : <Link className="btn btn-sm btn-primary" to={`/exam/${a.test.id}`}>Resume</Link>}<button className="btn btn-sm btn-danger" title="Delete this attempt" aria-label="Delete attempt" onClick={() => setAsk({ title: `Delete attempt #${a.attemptNo} of "${a.test.name}"?`, body: { ids: [a.id] }, label: "Delete attempt" })}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
          : <div className="card empty"><ClipboardList size={34} /><p>No attempts match this filter.</p></div>}
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete ALL practice and adaptive sessions?", body: { mode: "PRACTICE" }, label: "Delete all practice" })}><Trash2 size={14} />Clear all practice</button>
          <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete your ENTIRE attempt history?", body: { all: true }, label: "Delete everything" })}><Trash2 size={14} />Clear entire history</button></div></>}
      </section>}
      <AdSlot />
      {sel.size > 0 && <div className="bulk-bar"><b>{sel.size} selected</b><span style={{ flex: 1 }} /><button className="btn btn-sm" onClick={() => setSel(new Set())}>Cancel</button><button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: `Delete ${sel.size} selected attempt${sel.size > 1 ? "s" : ""}?`, body: { ids: [...sel] }, label: `Delete ${sel.size}` })}><Trash2 size={14} />Delete selected</button></div>}
    </div>
    {ask && <div className="modal-bg" onClick={() => !busyDel && setAsk(null)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title">{ask.title}</h3><p className="sub">This permanently removes the attempt(s), answers, results and their effect on your progress and Smart Coach. It cannot be undone. Tests with an attempt limit keep their official attempts.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busyDel} onClick={() => setAsk(null)}>Cancel</button><button className="btn btn-danger" disabled={busyDel} onClick={doDelete}><Trash2 size={15} />{busyDel ? "Deleting..." : ask.label}</button></div></div></div>}
  </Shell>;
}
