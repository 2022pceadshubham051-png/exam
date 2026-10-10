import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Search, Clock, FileText, Layers, Play, Target, Trophy, ClipboardList, ArrowRight, Eye, Sparkles, SlidersHorizontal, Medal, Trash2, Compass, X, TriangleAlert, CircleCheck } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell"; import AdSlot from "../components/AdSlot";
import Mascot from "../components/Mascot"; import { showLevelUp } from "../components/LevelUp"; import CountUp, { Wave } from "../components/CountUp"; import { confetti } from "../components/Confetti"; import { levelFromXp, xpFromAttempts, streakDays, saveLevel, savedLevel, saveXp, sfx } from "../lib/game";

const diff: Record<string, string> = { EASY: "pill-ok", MEDIUM: "pill-warn", HARD: "pill-bad" };
export default function Dashboard() {
  const [tests, setTests] = useState<any[] | null>(null); const [hist, setHist] = useState<any[]>([]); const [leaderboard, setLeaderboard] = useState<any[]>([]); const [q, setQ] = useState(""); const [mode, setMode] = useState<"all" | "practice" | "timed">("all"); const [diffFilter, setDiffFilter] = useState("ALL"); const [err, setErr] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    api("/tests/leaderboard?limit=8")
      .then((data) => { if (!cancelled) setLeaderboard(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setLeaderboard([]); });
    return () => { cancelled = true; };
  }, []);
  const done = hist.filter((a) => a.result); const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const shownTests = (tests ?? []).filter((t) => (diffFilter === "ALL" || t.difficulty === diffFilter) && (mode === "all" || (mode === "practice" ? t.allowPracticeMode !== false : true)));
  const shownHist = hist.filter((a) => (histMode === "all" || a.mode === histMode) && (histTest === "ALL" || a.test.id === histTest));
  const doDelete = async () => {
    if (!ask) return; setBusyDel(true);
    try { const r = await api("/history/delete", "POST", ask.body); setNote({ ok: true, m: `Deleted ${r.deleted} attempt${r.deleted === 1 ? "" : "s"}.${r.skipped ? ` ${r.skipped} official attempt(s) were kept because their test has an attempt limit.` : ""}` }); setSel(new Set()); await loadHist(); }
    catch (e: any) { setNote({ ok: false, m: e.message }); } finally { setBusyDel(false); setAsk(null); }
  };
  const xp = xpFromAttempts(done), lv = levelFromXp(xp), streak = streakDays(done);
  useEffect(() => { if (!hist.length) return; const prev = savedLevel(); if (prev && lv.level > prev) showLevelUp(lv.level, lv.title); saveLevel(lv.level); saveXp(xp); }, [lv.level, hist.length]); // eslint-disable-line
  const best = done.length ? Math.max(...done.map((a) => a.result.percentage)) : null;
  return <Shell>
    <div className="stack" style={{ gap: 26 }}>
      <section className="hero">
        <div className="blob" style={{ width: 220, height: 220, background: "#22d3ee", right: -40, top: -60 }} />
        <span className="spark s1">✦</span><span className="spark s2">★</span><span className="spark s3">✦</span><span className="spark s4">●</span>
        <div className="hero-mascot"><Mascot mood={streak > 2 ? "cheer" : "wave"} size={132} /></div>
        <h1><Wave text={done.length ? "Welcome back, player!" : "Ready for your first quest?"} /></h1>
        <p>Pick a test, beat the clock and collect XP. Every attempt makes you stronger.</p>
        <div className="xp-card"><div className="row between"><b>Lv {lv.level} · {lv.title}</b><span>{streak > 0 ? `🔥 ${streak}-day streak` : "🔥 Start a streak today"}</span></div><div className="xpbar"><i style={{ width: `${Math.max(4, lv.pct)}%` }} /></div><small>{lv.into} / {lv.need} XP to Level {lv.level + 1}</small></div>
        <div className="row" style={{ marginTop: 18, position: "relative" }}><Link to="/progress" className="btn" style={{ background: "#fff", color: "#3730a3", border: "none" }}>View my progress<ArrowRight size={16} /></Link></div>
      </section>

      <section className="grid-stats">
        <div className="stat"><div className="stat-l"><ClipboardList size={14} />Tests taken</div><div className="stat-v"><CountUp to={done.length} /></div></div>
        <div className="stat"><div className="stat-l"><Target size={14} />Average score</div><div className="stat-v">{avg === null ? "-" : <CountUp to={avg} suffix="%" />}</div></div>
        <div className="stat"><div className="stat-l"><Trophy size={14} />Best score</div><div className="stat-v">{best === null ? "-" : <CountUp to={best} suffix="%" />}</div></div>
        <div className="stat"><div className="stat-l"><FileText size={14} />Available tests</div><div className="stat-v">{tests ? <CountUp to={tests.length} /> : "-"}</div></div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <div className="row between" style={{ alignItems: "flex-end" }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Available tests</h2><p className="sub">Choose a timed mock or use untimed practice where available.</p></div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}><div className="seg"><button className={mode === "all" ? "on" : ""} onClick={() => setMode("all")}>All</button><button className={mode === "timed" ? "on" : ""} onClick={() => setMode("timed")}>Timed</button><button className={mode === "practice" ? "on" : ""} onClick={() => setMode("practice")}><Sparkles size={14} />Practice</button></div><select className="input" style={{ width: 150 }} value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} aria-label="Filter by difficulty"><option value="ALL">All levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select><div style={{ position: "relative", minWidth: 220 }}><Search size={16} style={{ position: "absolute", left: 13, top: 13, color: "var(--muted)" }} /><input className="input" style={{ paddingLeft: 38 }} placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} /></div></div></div>
        {err && <div className="alert alert-bad">{err}</div>}
        {!tests ? <Loading /> : shownTests.length ? <div className="grid-auto">{shownTests.map((t) => {
          const qs = t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
          return <article key={t.id} className="card tcard">
            <div className="row between"><span className="pill pill-brand">{t.examName}</span><span className={`pill ${diff[t.difficulty] ?? ""}`}>{t.difficulty.toLowerCase()}</span></div>
            <div><h3 style={{ fontSize: "1.12rem", fontWeight: 800 }}>{t.name}</h3>{t.description && <p className="sub" style={{ marginTop: 4 }}>{t.description}</p>}</div>
            <div className="meta"><span><Clock size={15} />{fmt(t.durationSec)}</span><span><FileText size={15} />{qs} questions</span><span><Layers size={15} />{t.sections.length} section{t.sections.length > 1 ? "s" : ""}</span>{t.allowPracticeMode !== false && <span><Sparkles size={15} />Practice</span>}</div>
            <div className="row" style={{ gap: 6 }}>{t.sections.map((s: any) => <span key={s.id} className="pill">{s.name}</span>)}</div>
            <Link className="btn btn-primary" to={`/exam/${t.id}`} style={{ marginTop: "auto" }}><Play size={16} />Open test</Link>
          </article>; })}</div>
          : <div className="card empty"><SlidersHorizontal size={34} /><p>{q || mode !== "all" || diffFilter !== "ALL" ? "No tests match these filters." : "No tests are published yet. Check back soon."}</p></div>}
      </section>

      <AdSlot />

      <section className="dashboard-split">
        <div className="card card-pad stack"><div className="row between"><div><h2 className="card-title row" style={{ gap: 8 }}><Trophy size={18} />Global leaderboard</h2><p className="sub">Top official exam performers. Practice sessions are excluded.</p></div><Link className="btn btn-sm" to="/progress">My performance<ArrowRight size={14} /></Link></div>
          {leaderboard.length ? <div className="leaderboard-list">{leaderboard.map((r) => <div className="leaderboard-row" key={r.rank}><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Medal size={14} /> : `#${r.rank}`}</span><div style={{ minWidth: 0, flex: 1 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</b><span className="sub">{r.attempts} official attempt{r.attempts > 1 ? "s" : ""}</span></div><div className="leader-score"><b>{r.average}%</b><small>avg · best {r.best}%</small></div></div>)}</div> : <div className="empty compact"><Trophy size={28} /><p>No leaderboard data yet.</p></div>}
        </div>
        <div className="card card-pad adaptive-home"><div className="adaptive-home-icon"><Sparkles size={21} /></div><div><span className="pill pill-brand">Adaptive learning</span><h2 className="card-title" style={{ marginTop: 8 }}>Turn your mistakes into the next test.</h2><p className="sub">Open the <Link to="/coach">Smart Coach</Link> to see your weak subjects rated out of 100, or open any test and choose <b>Adaptive practice</b>. ExamForge prioritises weaker topics and slower areas from your official attempts.</p></div><Link className="btn btn-primary" to={shownTests[0] ? `/exam/${shownTests[0].id}` : "/progress"}>{shownTests[0] ? "Start adaptive practice" : "View performance"}<ArrowRight size={15} /></Link></div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <div className="row between" style={{ alignItems: "flex-end" }}><div><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Test history</h2><p className="sub">Select attempts to delete them. Deleting removes the attempt, its answers and result from your history, progress and Smart Coach.</p></div>
          {hist.length > 0 && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><div className="seg">{([["all", "All"], ["EXAM", "Exams"], ["PRACTICE", "Practice"]] as const).map(([k, l]) => <button key={k} className={histMode === k ? "on" : ""} onClick={() => { setHistMode(k); setSel(new Set()); }}>{l}</button>)}</div>
            <select className="input" style={{ width: 190 }} value={histTest} onChange={(e) => { setHistTest(e.target.value); setSel(new Set()); }} aria-label="Filter history by test"><option value="ALL">All tests</option>{[...new Map(hist.map((a) => [a.test.id, a.test.name])).entries()].map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></div>}</div>
        {note && <div className={`alert ${note.ok ? "alert-ok" : "alert-bad"}`}>{note.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}<span style={{ flex: 1 }}>{note.m}</span><button className="btn btn-ghost btn-sm" onClick={() => setNote(null)}><X size={14} /></button></div>}
        {shownHist.length ? <div className="card table-wrap"><table className="t"><thead><tr><th style={{ width: 34 }}><input type="checkbox" className="hist-check" aria-label="Select all" checked={shownHist.length > 0 && shownHist.every((a) => sel.has(a.id))} onChange={(e) => setSel(e.target.checked ? new Set(shownHist.map((a) => a.id)) : new Set())} /></th><th>Test</th><th>Attempt</th><th>Score</th><th>Accuracy</th><th>Right / Wrong / Skipped</th><th>Mode</th><th>Time</th><th>Date</th><th /></tr></thead>
          <tbody>{shownHist.map((a) => <tr key={a.id}><td><input type="checkbox" className="hist-check" aria-label="Select attempt" checked={sel.has(a.id)} onChange={() => { const n = new Set(sel); n.has(a.id) ? n.delete(a.id) : n.add(a.id); setSel(n); }} /></td><td><b>{a.test.name}</b></td><td>#{a.attemptNo}</td>
            <td>{a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : a.resultHidden ? <span className="pill">Hidden</span> : <span className="pill pill-warn">In progress</span>}</td>
            <td>{a.result ? `${a.result.accuracy}%` : "-"}</td><td>{a.result ? `${a.result.correct} / ${a.result.incorrect} / ${a.result.unanswered}` : "-"}</td>
            <td><span className={`pill ${a.mode === "PRACTICE" ? "pill-brand" : ""}`}>{a.mode === "PRACTICE" ? (a.adaptiveQuestionIds ? "Adaptive" : "Practice") : "Exam"}</span></td><td>{a.result ? fmt(a.result.timeTakenSec) : "-"}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td>
            <td><div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>{a.result || a.resultHidden ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} />Result</Link> : <Link className="btn btn-sm btn-primary" to={`/exam/${a.test.id}`}>Resume</Link>}<button className="btn btn-sm btn-danger" title="Delete this attempt" aria-label="Delete attempt" onClick={() => setAsk({ title: `Delete attempt #${a.attemptNo} of "${a.test.name}"?`, body: { ids: [a.id] }, label: "Delete attempt" })}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
          : <div className="card empty"><ClipboardList size={34} /><p>{hist.length ? "No attempts match this filter." : "No attempts yet. Start a test above."}</p></div>}
        {hist.length > 0 && <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete ALL practice and adaptive sessions?", body: { mode: "PRACTICE" }, label: "Delete all practice" })}><Trash2 size={14} />Clear all practice</button>
          <button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: "Delete your ENTIRE attempt history?", body: { all: true }, label: "Delete everything" })}><Trash2 size={14} />Clear entire history</button>
          <Link className="btn btn-sm" to="/coach"><Compass size={14} />What should I improve?</Link></div>}
      </section>
      {sel.size > 0 && <div className="bulk-bar"><b>{sel.size} selected</b><span style={{ flex: 1 }} /><button className="btn btn-sm" onClick={() => setSel(new Set())}>Cancel</button><button className="btn btn-sm btn-danger" onClick={() => setAsk({ title: `Delete ${sel.size} selected attempt${sel.size > 1 ? "s" : ""}?`, body: { ids: [...sel] }, label: `Delete ${sel.size}` })}><Trash2 size={14} />Delete selected</button></div>}
    </div>
    {ask && <div className="modal-bg" onClick={() => !busyDel && setAsk(null)}><div className="card modal stack" style={{ gap: 12 }} onClick={(e) => e.stopPropagation()}>
      <h3 className="card-title">{ask.title}</h3><p className="sub">This permanently removes the attempt(s), answers, results and their effect on your progress and Smart Coach. It cannot be undone. Tests with an attempt limit keep their official attempts.</p>
      <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn" disabled={busyDel} onClick={() => setAsk(null)}>Cancel</button><button className="btn btn-danger" disabled={busyDel} onClick={doDelete}><Trash2 size={15} />{busyDel ? "Deleting..." : ask.label}</button></div></div></div>}
  </Shell>;
}
