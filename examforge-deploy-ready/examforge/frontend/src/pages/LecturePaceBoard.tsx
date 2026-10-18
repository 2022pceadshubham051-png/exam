import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Medal, Flame, BookOpen, Timer, Zap } from "lucide-react";
import Shell from "../components/Shell"; import { PageHeader, Empty, SkeletonRows } from "../components/ui";
import { api } from "../lib/api"; import AdSlot from "../components/AdSlot";
import { BoardTabs } from "./Leaderboard"; import NameTag from "../components/NameTag";

const focus = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

export default function LecturePaceBoard() {
  const [data, setData] = useState<{ rows: any[]; me: any } | null>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/lecture-pace/leaderboard?limit=25").then(setData).catch((e) => setErr(e.message)); }, []);
  const rows = data?.rows ?? [], me = data?.me;
  return <Shell><div className="stack" style={{ gap: 22 }}>
    <BoardTabs active="pace" />
    <PageHeader title="Lecture Pace leaderboard" sub="Ranked by XP: 10 per lecture finished, 5 per revision, 1 per focus minute. Demo courses do not count." />
    {err && <div className="alert alert-bad">{err}</div>}
    {me && <div className="card card-pad row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><span className="sub">Your rank</span><div className="stat-v">#{me.rank}</div></div><div><span className="sub">Level</span><div className="stat-v">{me.level}</div></div><div><span className="sub">XP</span><div className="stat-v">{me.xp}</div></div><div><span className="sub">Streak</span><div className="stat-v">{me.streak}d</div></div><Link to="/lecture-pace" className="btn btn-primary">Open planner</Link></div>}
    {!data && !err ? <SkeletonRows rows={5} /> : rows.length ? <>
      <section className="leader-podium">
        {rows.slice(0, 3).map((r) => <div key={r.rank} className={`podium-card podium-${r.rank}`}><div className="podium-icon">{r.rank === 1 ? <Trophy /> : <Medal />}</div><span className="sub">#{r.rank}</span><NameTag r={{ ...r, name: r.name + (r.you ? " (you)" : "") }} /><strong>{r.xp} XP</strong><small>Level {r.level} · {r.lectures} lectures · {r.streak}d streak</small></div>)}
      </section>
      <section className="card table-wrap"><table className="t"><caption className="sr">Lecture Pace leaderboard</caption><thead><tr><th>Rank</th><th>Student</th><th>Level</th><th>XP</th><th>Lectures</th><th>Focus</th><th>Streak</th></tr></thead><tbody>{rows.map((r) => <tr key={r.rank} style={r.you ? { background: "var(--brand-soft)" } : undefined}><td><span className={`rank-badge rank-${r.rank}`}>{r.rank <= 3 ? <Medal size={14} /> : `#${r.rank}`}</span></td><td><NameTag r={r} />{r.you && <span className="pill pill-brand" style={{ marginLeft: 8 }}>You</span>}</td><td>{r.level}</td><td><span className="pill pill-ok">{r.xp}</span></td><td>{r.lectures}</td><td>{focus(r.focusMin)}</td><td>{r.streak ? `${r.streak}d` : "–"}</td></tr>)}</tbody></table></section>
      <AdSlot />
      <div className="grid-stats"><div className="stat"><div className="stat-l"><Zap size={14} />Top XP</div><div className="stat-v">{rows[0].xp}</div></div><div className="stat"><div className="stat-l"><BookOpen size={14} />Most lectures</div><div className="stat-v">{Math.max(...rows.map((r) => r.lectures))}</div></div><div className="stat"><div className="stat-l"><Timer size={14} />Most focus</div><div className="stat-v">{focus(Math.max(...rows.map((r) => r.focusMin)))}</div></div><div className="stat"><div className="stat-l"><Flame size={14} />Best streak</div><div className="stat-v">{Math.max(...rows.map((r) => r.streak))}d</div></div></div>
    </> : !err && <Empty icon={<Trophy size={32} />} title="Nobody has logged study progress yet">Finish a lecture in the planner to appear here. <Link to="/lecture-pace">Open Lecture Pace</Link></Empty>}
  </div></Shell>;
}
