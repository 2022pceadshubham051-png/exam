import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { Search, Clock, FileText, Layers, Play, Target, Trophy, ClipboardList, ArrowRight, Eye } from "lucide-react";
import { api, fmt } from "../lib/api"; import Shell, { Loading } from "../components/Shell";

const diff: Record<string, string> = { EASY: "pill-ok", MEDIUM: "pill-warn", HARD: "pill-bad" };
export default function Dashboard() {
  const [tests, setTests] = useState<any[] | null>(null); const [hist, setHist] = useState<any[]>([]); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { const t = setTimeout(() => { Promise.all([api(`/tests?q=${encodeURIComponent(q)}`), api("/history")]).then(([t, h]) => { setTests(t); setHist(h); setErr(""); }).catch((e) => setErr(e.message)); }, 250); return () => clearTimeout(t); }, [q]);
  const done = hist.filter((a) => a.result); const avg = done.length ? Math.round(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null;
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
        <div className="row between"><h2 className="card-title" style={{ fontSize: "1.25rem" }}>Available tests</h2>
          <div style={{ position: "relative", minWidth: 240, flex: "0 1 320px" }}><Search size={16} style={{ position: "absolute", left: 13, top: 13, color: "var(--muted)" }} />
            <input className="input" style={{ paddingLeft: 38 }} placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        {err && <div className="alert alert-bad">{err}</div>}
        {!tests ? <Loading /> : tests.length ? <div className="grid-auto">{tests.map((t) => {
          const qs = t.sections.reduce((a: number, s: any) => a + s._count.questions, 0);
          return <article key={t.id} className="card tcard">
            <div className="row between"><span className="pill pill-brand">{t.examName}</span><span className={`pill ${diff[t.difficulty] ?? ""}`}>{t.difficulty.toLowerCase()}</span></div>
            <div><h3 style={{ fontSize: "1.12rem", fontWeight: 800 }}>{t.name}</h3>{t.description && <p className="sub" style={{ marginTop: 4 }}>{t.description}</p>}</div>
            <div className="meta"><span><Clock size={15} />{fmt(t.durationSec)}</span><span><FileText size={15} />{qs} questions</span><span><Layers size={15} />{t.sections.length} section{t.sections.length > 1 ? "s" : ""}</span></div>
            <div className="row" style={{ gap: 6 }}>{t.sections.map((s: any) => <span key={s.id} className="pill">{s.name}</span>)}</div>
            <Link className="btn btn-primary" to={`/exam/${t.id}`} style={{ marginTop: "auto" }}><Play size={16} />Start test</Link>
          </article>; })}</div>
          : <div className="card empty"><FileText size={34} /><p>{q ? "No tests match your search." : "No tests are published yet. Check back soon."}</p></div>}
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h2 className="card-title" style={{ fontSize: "1.25rem" }}>Test history</h2>
        {hist.length ? <div className="card table-wrap"><table className="t"><thead><tr><th>Test</th><th>Attempt</th><th>Score</th><th>Accuracy</th><th>Right / Wrong / Skipped</th><th>Time</th><th>Date</th><th /></tr></thead>
          <tbody>{hist.map((a) => <tr key={a.id}><td><b>{a.test.name}</b></td><td>#{a.attemptNo}</td>
            <td>{a.result ? <span className={`pill ${a.result.percentage >= 40 ? "pill-ok" : "pill-bad"}`}>{a.result.percentage}%</span> : <span className="pill pill-warn">In progress</span>}</td>
            <td>{a.result ? `${a.result.accuracy}%` : "-"}</td><td>{a.result ? `${a.result.correct} / ${a.result.incorrect} / ${a.result.unanswered}` : "-"}</td>
            <td>{a.result ? fmt(a.result.timeTakenSec) : "-"}</td><td>{new Date(a.startedAt).toLocaleDateString()}</td>
            <td>{a.result ? <Link className="btn btn-sm" to={`/result/${a.id}`}><Eye size={14} />Result</Link> : null}</td></tr>)}</tbody></table></div>
          : <div className="card empty"><ClipboardList size={34} /><p>No attempts yet. Start a test above.</p></div>}
      </section>
    </div>
  </Shell>;
}
