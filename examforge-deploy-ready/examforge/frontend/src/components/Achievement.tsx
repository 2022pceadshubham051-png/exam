import { useEffect, useState } from "react";
import { api } from "../lib/api";

/** Medal by score band. Bands are cosmetic only; they do not change pass/fail or scoring. */
export function Medal({ pct }: { pct: number }) {
  const tier = pct >= 85 ? ["Gold", "#f0b429", "#b7791f"] : pct >= 65 ? ["Silver", "#cbd2de", "#7c8698"] : pct >= 40 ? ["Bronze", "#d9955b", "#8f5a2c"] : null;
  if (!tier) return null;
  return <div className="medal" role="img" aria-label={`${tier[0]} medal for ${Math.round(pct)} percent`}>
    <svg width="56" height="78" viewBox="0 0 56 78" aria-hidden="true" focusable="false">
      <path d="M14 0h12l6 22H20z" fill="var(--brand)" /><path d="M42 0H30l-6 22h12z" fill="var(--gold)" />
      <circle cx="28" cy="50" r="22" fill={tier[1]} stroke={tier[2]} strokeWidth="3" /><circle cx="28" cy="50" r="15" fill="none" stroke={tier[2]} strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M28 40l3 7 8 .7-6 5.3 2 7.7-7-4.2-7 4.2 2-7.7-6-5.3 8-.7z" fill={tier[2]} />
    </svg><span>{tier[0]}</span>
  </div>;
}

/** Score history for this test, drawn from the person's own completed attempts (needs 2 or more). */
export function Sparkline({ testId, currentId }: { testId: string; currentId?: string }) {
  const [pts, setPts] = useState<{ id: string; v: number }[] | null>(null);
  useEffect(() => {
    let live = true;
    api("/history").then((rows: any[]) => {
      if (!live || !Array.isArray(rows)) return;
      const mine = rows.filter((a) => a.result && (a.test?.id ?? a.testId) === testId).sort((a, b) => +new Date(a.startedAt) - +new Date(b.startedAt)).slice(-8);
      setPts(mine.map((a) => ({ id: a.id, v: a.result.percentage })));
    }).catch(() => live && setPts([]));
    return () => { live = false; };
  }, [testId]);
  if (!pts || pts.length < 2) return null;
  const W = 260, H = 64, P = 8, x = (i: number) => P + (i * (W - 2 * P)) / (pts.length - 1), y = (v: number) => H - P - (Math.max(0, Math.min(100, v)) / 100) * (H - 2 * P);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1], first = pts[0], diff = Math.round(last.v - first.v);
  return <figure className="spark card card-pad" style={{ margin: 0 }} aria-label={`Your last ${pts.length} scores on this test: ${pts.map((p) => Math.round(p.v) + "%").join(", ")}`}>
    <div className="row between"><b>Your scores on this test</b><span className={`pill ${diff >= 0 ? "pill-ok" : "pill-bad"}`}>{diff >= 0 ? "+" : ""}{diff} pts since first</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 520, height: "auto" }} aria-hidden="true"><path className="spark-line" d={d} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" pathLength="1" />
      {pts.map((p, i) => <circle key={p.id} className={i === pts.length - 1 ? "spark-dot last" : "spark-dot"} cx={x(i)} cy={y(p.v)} r={i === pts.length - 1 ? 4.5 : 3} fill={i === pts.length - 1 ? "var(--gold)" : "var(--brand)"} stroke="var(--surface)" strokeWidth="1.5" style={{ animationDelay: `${0.5 + i * 0.08}s` }} />)}</svg>
  </figure>;
}

/** Last 7 days of practice as dots. Real attempt dates only. */
export function WeekDots({ done }: { done: any[] }) {
  const days = new Set(done.map((a) => new Date(a.startedAt).toDateString()));
  const list = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { d, on: days.has(d.toDateString()), today: i === 6 }; });
  return <ol className="week-dots" aria-label={`Practice days this week: ${list.filter((x) => x.on).length} of 7`}>{list.map((x, i) => <li key={i} className={`${x.on ? "on" : ""} ${x.today ? "today" : ""}`} style={{ animationDelay: `${i * 70}ms` }}><i aria-hidden="true" /><span>{x.d.toLocaleDateString(undefined, { weekday: "narrow" })}<span className="sr">{x.d.toLocaleDateString(undefined, { weekday: "long" })}: {x.on ? "practised" : "no practice"}</span></span></li>)}</ol>;
}
