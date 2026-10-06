import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Search, Clock, FileText, Layers, Play, Target, Trophy, ClipboardList, ArrowRight, Eye, Sparkles, SlidersHorizontal, Medal } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

const diff: Record<string, string> = { EASY: "pill-ok", MEDIUM: "pill-warn", HARD: "pill-bad" };
export default function Dashboard() {
  const [tests, setTests] = useState<any[] | null>(null); const [hist, setHist] = useState<any[]>([]); const [leaderboard, setLeaderboard] = useState<any[]>([]); const [q, setQ] = useState(""); const [mode, setMode] = useState<"all" | "practice" | "timed">("all"); const [diffFilter, setDiffFilter] = useState("ALL"); const [err, setErr] = useState("");
  useEffect(() => { const t = setTimeout(() => { Promise.all([api(`/tests?q=${encodeURIComponent(q)}`), api("/history"), api("/tests/leaderboard?limit=8")]).then(([t, h, l]) => { setTests(t); setHist(h); setLeaderboard(l); setErr(""); }).catch((e) => setErr(e.message)); }, 250); return () => clearTimeout(t); }, [q]);
  const done = hist.filter((a) => a.result); const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
  const shownTests = (tests ?? []).filter((t) => (diffFilter === "ALL" || t.difficulty === diffFilter) && (mode === "all" || (mode === "practice" ? t.allowPracticeMode !== false : true)));
  const best = done.length ? Math.max(...done.map((a) => a.result.percentage)) : null;
  return <Shell>
    <div className="stack" style={{ gap: 26 }}>
      <section className="hero">
        <div className="blob" style={{ width: 220, height: 220, background: "#22d3ee", right: -40, top: -60 }} />
        <h1>Ready for your next mock test?</h1>
        <p>Pick a test, focus on the clock and review every answer afterwards. Small steady improvements add up.</p>
        <div className="row" style={{ marginTop: 18, position: "relative" }}><Link to="/progress" className="btn" style={{ background: "#fff", color: "#3730a3", border: "none" }}>View my progress<ArrowRight size={16} /></Link></div>
      </section>

      <section className="grid-stats">
        <div className="stat"><div className="stat-l"><ClipboardList size={14} />Tests taken</div><div className="stat-v">{done.length}</div></div>
        <div className="stat"><div className="stat-l"><Target size={14} />Average score</div><div className="stat-v">{avg === null ? "-" : `${avg}%`}</div></div>
        <div className="stat"><div className="stat-l"><Trophy size={14} />Best score</div><div className="stat-v">{best === null ? "-" : `${best}%`}</div></div>
        <div className="stat"><div className="stat-l"><FileText size={14} />Available tests</div><div className="stat-v">{tests?.length ?? "-"}</div></div>
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

      <section className="dashboard-split">
        <div className="card card-pad stack"><div className="row between"><div><h2 className="card-title row" style={{ gap: 8 }}><Trophy size={18} />Global leaderboard</h2><p className="sub">Top official exam performers. Practice sessions are excluded.</p></div><Link className="btn btn-sm" to="/progress">My performance<ArrowRight size={14} /></Link></div>
          {leaderboard.length ? <div className="leaderboard-list">{leaderboard.map((r) => <div className="leaderboard-row" key={r.rank}><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Medal size={14} /> : `#${r.rank}`}</span><div style={{ minWidth: 0, flex: 1 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</b><span className="sub">{r.attempts} official attempt{r.attempts > 1 ? "s" : ""}</span></div><div className="leader-score"><b>{r.average}%</b><small>avg · best {r.best}%</small></div></div>)}</div> : <div className="empty compact"><Trophy size={28} /><p>No leaderboard data yet.</p></div>}
        </div>
        <div className="card card-pad adaptive-home"><div className="adaptive-home-icon"><Sparkles size={21} /></div><div><span className="pill pill-brand">Adaptive learning</span><h2 className="card-title" style={{ marginTop: 8 }}>Turn your mistakes into the next test.</h2><p className="sub">Open any test and choose <b>Adaptive practice</b>. ExamForge prioritises weaker topics and slower areas from your official attempts.</p></div><Link className="btn btn-primary" to={shownTests[0] ? `/exam/${shownTests[0].id}` : "/progress"}>{shownTests[0] ? "Start adaptive practice" : "View performance"}<ArrowRight size={15} /></Link></div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h2 className="card-title" style={{ fontSize: "1.25rem" }}>Test history</h2>
        {hist.length ? <div className="card table-wrap"><table className="t"><thead><tr><th>Test</th><th>Attempt</th><th>Score</th><th>Accuracy</th><th>Right / Wrong / Skipped</th><th>Mode</th><th>Time</th><th>Date</th><th /></tr></thead>
          <tbody>{hist.map((a) => <tr key={a.id}><td><b>{a.test.name}</b></td><td>#{a.attemptNo}</td>
            <td>{a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : <span className="pill pill-warn">In progress</span>}</td>
            <td>{a.result ? `${a.result.accuracy}%` : "-"}</td><td>{a.result ? `${a.result.correct} / ${a.result.incorrect} / ${a.result.unanswered}` : "-"}</td>
            <td>{a.result ? <span className={`pill ${a.mode === "PRACTICE" ? "pill-brand" : ""}`}>{a.mode === "PRACTICE" ? "Practice" : "Exam"}</span> : "-"}</td><td>{a.result ? fmt(a.result.timeTakenSec) : "-"}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td>
            <td>{a.result ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} />Result</Link> : null}</td></tr>)}</tbody></table></div>
          : <div className="card empty"><ClipboardList size={34} /><p>No attempts yet. Start a test above.</p></div>}
      </section>
    </div>
  </Shell>;
}
