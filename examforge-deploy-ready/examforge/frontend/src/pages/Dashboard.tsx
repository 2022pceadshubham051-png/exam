import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Search, Play, ArrowRight, Eye, SlidersHorizontal, Trash2, Compass, X, TriangleAlert, CircleCheck, ClipboardList } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell from "../components/Shell"; import AdSlot from "../components/AdSlot"; import { PageHeader, Empty, ConfirmDialog, SkeletonRows, SkeletonCards } from "../components/ui"; import { loadProfile, matchesExam, firstName, type Profile } from "../lib/profile";
import { WeekDots, StreakFlame } from "../components/Achievement"; import { JourneyStrip } from "../components/Journey"; import { Flame } from "lucide-react"; import { showLevelUp } from "../components/LevelUp"; import { levelFromXp, xpFromAttempts, streakDays, saveLevel, savedLevel, saveXp } from "../lib/game";

const diff: Record<string, string> = { EASY: "pill-ok", MEDIUM: "pill-warn", HARD: "pill-bad" };
const kind = (a: any) => (a.mode === "PRACTICE" ? (a.adaptiveQuestionIds ? "Adaptive" : "Practice") : "Exam");

export default function Dashboard() {
  const [prof, setProf] = useState<Profile | null>(null); const [scope, setScope] = useState<"mine" | "all">("mine");
  const [tests, setTests] = useState<any[] | null>(null); const [hist, setHist] = useState<any[] | null>(null); const [q, setQ] = useState(""); const [diffFilter, setDiffFilter] = useState("ALL"); const [err, setErr] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set()); const [histMode, setHistMode] = useState<"all" | "EXAM" | "PRACTICE">("all"); const [histTest, setHistTest] = useState("ALL");
  const [ask, setAsk] = useState<null | { title: string; body: any; label: string }>(null); const [note, setNote] = useState<null | { ok: boolean; m: string }>(null); const [busyDel, setBusyDel] = useState(false); const [showAll, setShowAll] = useState(false);
  useEffect(() => { loadProfile().then(setProf).catch(() => {}); }, []);
  const loadHist = () => api("/history").then((d) => setHist(Array.isArray(d) ? d : [])).catch(() => setHist([]));
  useEffect(() => { void loadHist(); }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setTests(null);
      api(`/tests?limit=100&q=${encodeURIComponent(q)}`)
        .then((data) => { if (cancelled) return; if (!Array.isArray(data)) throw new Error("Unexpected response from the tests API."); setTests(data); setErr(""); })
        .catch((e) => { if (cancelled) return; setTests([]); setErr(e instanceof Error ? e.message : "Unable to load tests."); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  const all = hist ?? [];
  const done = all.filter((a) => a.result); const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const best = done.length ? Math.max(...done.map((a) => a.result.percentage)) : null;
  const target = prof?.targetExam ?? null, fn = firstName(prof);
  const mineAll = (tests ?? []).filter((t) => matchesExam(t.examName, target)), useMine = !!target && scope === "mine" && mineAll.length > 0;
  const shownTests = [...(useMine ? mineAll : tests ?? [])].sort((a, b) => Number(!matchesExam(a.examName, target)) - Number(!matchesExam(b.examName, target))).filter((t) => diffFilter === "ALL" || t.difficulty === diffFilter);
  const shownHist = all.filter((a) => (histMode === "all" || a.mode === histMode) && (histTest === "ALL" || a.test.id === histTest));
  const doDelete = async () => {
    if (!ask || busyDel) return; setBusyDel(true);
    try { const r = await api("/history/delete", "POST", ask.body); setNote({ ok: true, m: `Deleted ${r.deleted} attempt${r.deleted === 1 ? "" : "s"}.${r.skipped ? ` ${r.skipped} official attempt(s) were kept because their test has an attempt limit.` : ""}` }); setSel(new Set()); await loadHist(); }
    catch (e: any) { setNote({ ok: false, m: e.message }); } finally { setBusyDel(false); setAsk(null); }
  };
  const xp = xpFromAttempts(done), lv = levelFromXp(xp), streak = streakDays(done);
  useEffect(() => { if (!all.length) return; const prev = savedLevel(); if (prev && lv.level > prev) showLevelUp(lv.level, lv.title); saveLevel(lv.level); saveXp(xp); }, [lv.level, all.length]); // eslint-disable-line
  const active = all.find((a) => !a.result && !a.resultHidden);
  const next = shownTests[0];
  const qCount = (t: any) => t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);

  return <Shell>
    <div className="stack stagger" style={{ gap: 28 }}>
      <PageHeader title={done.length ? `Welcome back${fn ? `, ${fn}` : ""}` : `Hi${fn ? `, ${fn}` : ""}`} sub={target ? `Preparing for ${target}${prof?.targetScore ? ` · goal ${prof.targetScore}%` : ""}` : "Pick a test below and start practising."} />

      {active ? <section className="next-card" aria-label="Continue where you left off">
        <div><span className="pill pill-warn">In progress</span><h2>{active.test.name}</h2><p className="sub">You left this {active.mode === "PRACTICE" ? "practice session" : "test"} unfinished. Your answers are saved.</p></div>
        <Link className="btn btn-primary btn-lg" to={`/exam/${active.test.id}`}><Play size={18} aria-hidden="true" />Continue</Link>
      </section> : next ? <section className="next-card" aria-label="Suggested test">
        <div><span className="pill pill-brand">{done.length ? "Suggested next" : "Start here"}</span><h2>{next.name}</h2><p className="sub">{next.examName} · {fmt(next.durationSec)} · {qCount(next)} questions</p></div>
        <Link className="btn btn-primary btn-lg" to={`/exam/${next.id}`}><Play size={18} aria-hidden="true" />{done.length ? "Start test" : "Take your first test"}</Link>
      </section> : null}

      {done.length > 0 && avg !== null && <section className="card" aria-label="Your journey"><JourneyStrip value={avg} goal={prof?.targetScore ?? null} label="Average score" /></section>}

      <div className="dash-grid">
        <div className="stack" style={{ gap: 28, minWidth: 0 }}>
          <section className="stack" id="tests" style={{ gap: 14 }} aria-labelledby="tests-h">
            <div className="row between"><h2 className="section-h" id="tests-h">All tests</h2><Link className="btn btn-sm btn-ghost" to="/coach"><Compass size={14} aria-hidden="true" />Not sure what to practise?</Link></div>
            <div className="filter-bar">
              <div className="search"><Search size={16} aria-hidden="true" /><input className="input" type="search" placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" /></div>
              {target && mineAll.length > 0 && <div className="seg" role="group" aria-label="Exam filter"><button aria-pressed={scope === "mine"} className={scope === "mine" ? "on" : ""} onClick={() => setScope("mine")}>{target}</button><button aria-pressed={scope === "all"} className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All exams</button></div>}
              <select className="input select" style={{ width: "auto" }} value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} aria-label="Filter by difficulty"><option value="ALL">Any level</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select>
            </div>
            {target && tests && mineAll.length === 0 && !q && <div className="alert alert-info">No {target} tests yet, so you are seeing every test.</div>}
            {err && <div className="alert alert-bad" role="alert"><TriangleAlert size={16} />{err}</div>}
            {!tests ? <SkeletonCards n={4} /> : shownTests.length ? <div className="test-list">{shownTests.map((t) => <Link key={t.id} to={`/exam/${t.id}`} className="test-row">
              <div style={{ minWidth: 0 }}><h3 className="ellipsis">{t.name}</h3><div className="meta"><span>{t.examName}</span><span>{fmt(t.durationSec)}</span><span>{qCount(t)} questions</span></div></div>
              <span className={`pill ${diff[t.difficulty] ?? ""}`}>{t.difficulty.toLowerCase()}</span><span className="go">Open<ArrowRight size={15} aria-hidden="true" /></span></Link>)}</div>
              : <Empty icon={<SlidersHorizontal size={30} />} title={q || diffFilter !== "ALL" ? "No tests match your search" : "No tests are published yet"}>{q || diffFilter !== "ALL" ? "Try a different search or level." : "Check back soon."}</Empty>}
          </section>

          {hist === null ? null : all.length > 0 && <section className="stack" style={{ gap: 14 }} aria-labelledby="att-h">
            <div className="row between"><h2 className="section-h" id="att-h">Recent attempts</h2><button className="btn btn-sm btn-ghost" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "Show less" : "Show all & manage"}</button></div>
            {note && <div className={`alert ${note.ok ? "alert-ok" : "alert-bad"}`} role={note.ok ? "status" : "alert"}>{note.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}<span style={{ flex: 1 }}>{note.m}</span><button className="btn btn-ghost btn-sm icon-btn" aria-label="Dismiss message" onClick={() => setNote(null)}><X size={14} /></button></div>}
            {!showAll ? <div className="card attempt-list">{all.slice(0, 5).map((a) => <div className="attempt-row" key={a.id}>
              <div style={{ minWidth: 0, flex: 1 }}><b className="ellipsis">{a.test.name}</b><span className="sub">{new Date(a.startedAt).toLocaleDateString()} · {kind(a)}</span></div>
              {a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : a.resultHidden ? <span className="pill">Hidden</span> : <span className="pill pill-warn">In progress</span>}
              {a.result || a.resultHidden ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} aria-hidden="true" />Result</Link> : <Link className="btn btn-sm btn-primary" to={`/exam/${a.test.id}`}>Resume</Link>}
            </div>)}</div> : <>
              <div className="row"><div className="seg" role="group" aria-label="Attempt type">{([["all", "All"], ["EXAM", "Exams"], ["PRACTICE", "Practice"]] as const).map(([k, l]) => <button key={k} aria-pressed={histMode === k} className={histMode === k ? "on" : ""} onClick={() => { setHistMode(k); setSel(new Set()); }}>{l}</button>)}</div>
                <select className="input select" style={{ width: 200 }} value={histTest} onChange={(e) => { setHistTest(e.target.value); setSel(new Set()); }} aria-label="Filter history by test"><option value="ALL">All tests</option>{[...new Map(all.map((a) => [a.test.id, a.test.name])).entries()].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>
              {shownHist.length ? <div className="card table-wrap"><table className="t"><caption className="sr">Your attempts</caption><thead><tr><th style={{ width: 34 }}><input type="checkbox" className="hist-check" aria-label="Select all attempts" checked={shownHist.length > 0 && shownHist.every((a) => sel.has(a.id))} onChange={(e) => setSel(e.target.checked ? new Set(shownHist.map((a) => a.id)) : new Set())} /></th><th>Test</th><th>Score</th><th>Right / Wrong / Skipped</th><th>Date</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>{shownHist.map((a) => <tr key={a.id}><td><input type="checkbox" className="hist-check" aria-label={`Select ${a.test.name}, attempt ${a.attemptNo}`} checked={sel.has(a.id)} onChange={() => { const n = new Set(sel); n.has(a.id) ? n.delete(a.id) : n.add(a.id); setSel(n); }} /></td><td><b>{a.test.name}</b><div className="sub">Attempt #{a.attemptNo} · {kind(a)}</div></td>
                  <td>{a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : a.resultHidden ? <span className="pill">Hidden</span> : <span className="pill pill-warn">In progress</span>}</td>
                  <td>{a.result ? `${a.result.correct} / ${a.result.incorrect} / ${a.result.unanswered}` : "-"}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td>
                  <td><div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>{a.result || a.resultHidden ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} aria-hidden="true" />Result</Link> : <Link className="btn btn-sm btn-primary" to={`/exam/${a.test.id}`}>Resume</Link>}<button className="btn btn-sm btn-danger icon-btn" aria-label={`Delete attempt ${a.attemptNo} of ${a.test.name}`} data-tip="Delete" onClick={() => setAsk({ title: `Delete attempt #${a.attemptNo} of "${a.test.name}"?`, body: { ids: [a.id] }, label: "Delete attempt" })}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
                : <Empty compact icon={<ClipboardList size={28} />} title="No attempts match this filter" />}
              <div className="row">
                <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete ALL practice and adaptive sessions?", body: { mode: "PRACTICE" }, label: "Delete all practice" })}><Trash2 size={14} aria-hidden="true" />Clear all practice</button>
                <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete your ENTIRE attempt history?", body: { all: true }, label: "Delete everything" })}><Trash2 size={14} aria-hidden="true" />Clear entire history</button></div></>}
          </section>}
        </div>

        <aside className="dash-aside" aria-label="Your progress">
          <div className="card card-pad mini-progress">
            <div className="row between"><h2 className="card-title">Your progress</h2><span className="pill pill-gold">Level {lv.level}</span></div>
            {done.length ? <><dl><dt>Tests completed</dt><dd>{done.length}</dd><dt>Average score</dt><dd>{avg}%</dd><dt>Best score</dt><dd>{best}%</dd><dt>Day streak</dt><dd>{streak > 0 && <StreakFlame n={streak} />}{streak}</dd></dl><WeekDots done={done} /></>
              : <p className="sub">Finish your first test to see your average, best score and streak here.</p>}
            <div><div className="row between sub" style={{ marginBottom: 6 }}><span>{lv.title}</span><span className="num">{lv.into} / {lv.need} XP</span></div><div className="xpbar" role="progressbar" aria-label="XP to next level" aria-valuenow={lv.pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(3, lv.pct)}%` }} /></div></div>
            <Link className="btn btn-sm" to="/progress">Full progress<ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
      <AdSlot />
      {sel.size > 0 && <div className="bulk-bar" role="region" aria-label="Selected attempts"><b>{sel.size} selected</b><span style={{ flex: 1 }} /><button className="btn btn-sm" onClick={() => setSel(new Set())}>Cancel</button><button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: `Delete ${sel.size} selected attempt${sel.size > 1 ? "s" : ""}?`, body: { ids: [...sel] }, label: `Delete ${sel.size}` })}><Trash2 size={14} aria-hidden="true" />Delete selected</button></div>}
    </div>
    <ConfirmDialog open={!!ask} danger busy={busyDel} title={ask?.title ?? ""} confirmLabel={ask?.label} onConfirm={doDelete} onCancel={() => setAsk(null)}>This permanently removes the attempt(s), answers, results and their effect on your progress and Smart Coach. It cannot be undone. Tests with an attempt limit keep their official attempts.</ConfirmDialog>
  </Shell>;
}
