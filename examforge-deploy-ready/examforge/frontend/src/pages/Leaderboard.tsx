import SubNav from "../components/SubNav";
import { useEffect, useState } from "react"; import { useNavigate } from "react-router-dom";
import { Trophy, Medal, Target, Timer, TrendingUp } from "lucide-react";
import Shell from "../components/Shell"; import { PageHeader, Empty, SkeletonRows } from "../components/ui";
import { api, fmt } from "../lib/api"; import NameTag from "../components/NameTag"; import AdSlot from "../components/AdSlot";

export function BoardTabs({ active }: { active: "exam" | "pace" }) {
  const go = useNavigate();
  return <div className="seg" role="group" aria-label="Leaderboard type" style={{ alignSelf: "flex-start" }}><button aria-pressed={active === "exam"} className={active === "exam" ? "on" : ""} onClick={() => go("/leaderboard")}><Trophy size={15} aria-hidden="true" />Exams</button><button aria-pressed={active === "pace"} className={active === "pace" ? "on" : ""} onClick={() => go("/lecture-pace/leaderboard")}><Timer size={15} aria-hidden="true" />Lecture Pace</button></div>;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/tests/leaderboard?limit=25").then(setRows).catch((e) => setErr(e.message)); }, []);
  return <Shell><div className="stack" style={{gap:22}}>
    <SubNav group="practice" />
    <BoardTabs active="exam" />
    <PageHeader title="Leaderboard" sub="Rankings are calculated from completed Exam-mode attempts. Untimed Practice and Smart practice never affect these standings." />
    {err && <div className="alert alert-bad" role="alert">{err}</div>}
    {!rows && !err ? <SkeletonRows rows={5} /> : !rows ? null : rows.length ? <>
      <section className="leader-podium">
        {rows.slice(0,3).map((r) => <div key={r.rank} className={`podium-card podium-${r.rank}`}><div className="podium-icon">{r.rank === 1 ? <Trophy/> : <Medal/>}</div><span className="sub">#{r.rank}</span><NameTag r={r} /><strong>{r.average}%</strong><small>{r.attempts} attempts · best {r.best}%</small></div>)}
      </section>
      <section className="card table-wrap"><table className="t"><caption className="sr">Exam leaderboard</caption><thead><tr><th>Rank</th><th>Student</th><th>Average</th><th>Best</th><th>Accuracy</th><th>Attempts</th><th>Avg time</th></tr></thead><tbody>{rows.map((r) => <tr key={r.rank}><td><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Medal size={14}/> : `#${r.rank}`}</span></td><td><NameTag r={r} /></td><td><span className="pill pill-ok">{r.average}%</span></td><td>{r.best}%</td><td>{r.averageAccuracy}%</td><td>{r.attempts}</td><td>{fmt(r.averageTimeSec)}</td></tr>)}</tbody></table></section>
      <AdSlot />
      <div className="grid-stats"><div className="stat"><div className="stat-l"><Target size={14}/>Best average</div><div className="stat-v">{rows[0].average}%</div></div><div className="stat"><div className="stat-l"><TrendingUp size={14}/>Top score</div><div className="stat-v">{rows[0].best}%</div></div><div className="stat"><div className="stat-l"><Timer size={14}/>Top avg time</div><div className="stat-v">{fmt(rows[0].averageTimeSec)}</div></div></div>
    </> : <Empty icon={<Trophy size={32}/>} title="No official attempts yet">Rankings appear after students submit Exam-mode attempts.</Empty>}
  </div></Shell>;
}
