import { useEffect, useState } from "react";
import { TrophyBuddy } from "../components/Buddies";
import { Trophy, Medal, Target, Timer, TrendingUp } from "lucide-react";
import Shell, { Loading } from "../components/Shell";
import { api, fmt } from "../lib/api"; import AdSlot from "../components/AdSlot";

export default function Leaderboard() {
  const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/tests/leaderboard?limit=25").then(setRows).catch((e) => setErr(e.message)); }, []);
  return <Shell><div className="stack" style={{gap:22}}>
    <section className="hero leaderboard-hero"><div className="blob" style={{width:210,height:210,background:"#f59e0b",right:-40,top:-60}}/><div className="hero-mascot"><TrophyBuddy size={128}/></div><span className="pill pill-brand"><Trophy size={14}/>Official ranking</span><h1>Leaderboard</h1><p>Rankings are calculated from completed Exam mode attempts. Untimed Practice and Adaptive Practice never affect these standings.</p></section>
    {err && <div className="alert alert-bad">{err}</div>}
    {!rows ? <Loading text="Loading leaderboard"/> : rows.length ? <>
      <section className="leader-podium">
        {rows.slice(0,3).map((r) => <div key={r.rank} className={`podium-card podium-${r.rank}`}><div className="podium-icon">{r.rank === 1 ? <Trophy/> : <Medal/>}</div><span className="sub">#{r.rank}</span><b>{r.name}</b><strong>{r.average}%</strong><small>{r.attempts} attempts · best {r.best}%</small></div>)}
      </section>
      <section className="card table-wrap"><table className="t"><thead><tr><th>Rank</th><th>Student</th><th>Average</th><th>Best</th><th>Accuracy</th><th>Attempts</th><th>Avg time</th></tr></thead><tbody>{rows.map((r) => <tr key={r.rank}><td><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Medal size={14}/> : `#${r.rank}`}</span></td><td><b>{r.name}</b></td><td><span className="pill pill-ok">{r.average}%</span></td><td>{r.best}%</td><td>{r.averageAccuracy}%</td><td>{r.attempts}</td><td>{fmt(r.averageTimeSec)}</td></tr>)}</tbody></table></section>
      <AdSlot />
      <div className="grid-stats"><div className="stat"><div className="stat-l"><Target size={14}/>Best average</div><div className="stat-v">{rows[0].average}%</div></div><div className="stat"><div className="stat-l"><TrendingUp size={14}/>Top score</div><div className="stat-v">{rows[0].best}%</div></div><div className="stat"><div className="stat-l"><Timer size={14}/>Top avg time</div><div className="stat-v">{fmt(rows[0].averageTimeSec)}</div></div></div>
    </> : <div className="card empty"><Trophy size={36}/><p>No official attempts have been submitted yet.</p></div>}
  </div></Shell>;
}
