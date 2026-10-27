import { useMemo, useState, type CSSProperties } from "react";
import { TriangleAlert } from "lucide-react";
import { W, makeGeo, scenery, Country } from "./RouteScenery"; import LazyMount from "./LazyMount"; import { themeFor } from "../lib/themes";

type L = { id: string; title: string; subject: string; subjectId: string; theme: string | null; done: number; pct: number; dropPct: number };

/** Admin: the course as the students see it (a map per subject, in the subject's own look), but every station is coloured by how many students finished it.
 *  Red stations are where students stop. The station with the biggest drop is marked. */
export default function DropMap({ lessons, students, worstId }: { lessons: L[]; students: number; worstId: string | null }) {
  const subjects = useMemo(() => { const m = new Map<string, { id: string; name: string; theme: string | null; items: L[] }>(); for (const l of lessons) { const e = m.get(l.subjectId) ?? { id: l.subjectId, name: l.subject, theme: l.theme, items: [] }; e.items.push(l); m.set(l.subjectId, e); } return [...m.values()]; }, [lessons]);
  const [pick, setPick] = useState(() => Math.max(0, subjects.findIndex((s) => s.items.some((l) => l.id === worstId)))); const [sel, setSel] = useState<string | null>(null);
  const s = subjects[Math.min(pick, subjects.length - 1)]; if (!s) return null;
  return <div className="stack" style={{ gap: 10 }}>
    {subjects.length > 1 && <div className="chip-row" role="group" aria-label="Subject">{subjects.map((x, i) => <button key={x.id} type="button" className={`cf-chip ${i === pick ? "on" : ""}`} onClick={() => { setPick(i); setSel(null); }}>{x.name}</button>)}</div>}
    <LazyMount className="rt-wrap dm-wrap" key={s.id}><Stretch s={s} sel={sel} setSel={setSel} students={students} worstId={worstId} /></LazyMount>
    <div className="dm-legend" aria-hidden="true"><span>Most students finish</span><i /><span>Most stop here</span></div>
  </div>;
}

function Stretch({ s, sel, setSel, students, worstId }: { s: { id: string; name: string; theme: string | null; items: L[] }; sel: string | null; setSel: (k: string | null) => void; students: number; worstId: string | null }) {
  const n = s.items.length, geo = useMemo(() => makeGeo(n), [n]), theme = useMemo(() => themeFor({ id: s.id, name: s.name, theme: s.theme }), [s]), sc = useMemo(() => scenery(geo, s.id, theme), [geo, s.id, theme]);
  const chosen = s.items.findIndex((l) => l.id === sel), cl = chosen >= 0 ? s.items[chosen] : null, cp = chosen >= 0 ? geo.nodes[chosen] : null;
  return <div className="rt-map dm-map" data-theme={theme.id} style={{ aspectRatio: `${W} / ${geo.H}`, animation: "none" }}>
    <svg className="rt-svg" viewBox={`0 0 ${W} ${geo.H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Country geo={geo} id={`dm-${s.id}`} sc={sc} theme={theme} />
      {geo.segs.map((d, k) => <g key={k} className="rt-seg on"><path d={d} className="b" /><path d={d} className="sl" /><path d={d} className="r1" /><path d={d} className="r2" /></g>)}
    </svg>
    {s.items.map((l, i) => { const p = geo.nodes[i], st = { left: `${(p.x / W) * 100}%`, top: `${(p.y / geo.H) * 100}%`, "--p": Math.max(0, Math.min(100, l.pct)) } as CSSProperties;
      return <button key={l.id} type="button" style={st} className={`rt-pin dm-pin ${l.id === worstId ? "worst" : ""} ${sel === l.id ? "sel" : ""}`} aria-expanded={sel === l.id} aria-label={`${l.title}: ${l.pct}% of students finished`} onClick={() => setSel(sel === l.id ? null : l.id)}>
        {l.pct}%{l.id === worstId && <b className="badge lock"><TriangleAlert size={10} /></b>}</button>; })}
    {cl && cp && <div className={`rt-pop ${cp.y / geo.H > 0.55 ? "up" : "down"}`} role="dialog" aria-label={cl.title} style={{ left: `clamp(124px, ${(cp.x / W) * 100}%, calc(100% - 124px))`, ...(cp.y / geo.H > 0.55 ? { bottom: `calc(${(1 - cp.y / geo.H) * 100}% + 34px)` } : { top: `calc(${(cp.y / geo.H) * 100}% + 34px)` }) }}>
      <small className="rt-st">Station {chosen + 1}</small><b className="rt-pop-t">{cl.title}</b>
      <span className="rt-pop-s">{cl.done} of {students} students finished it ({cl.pct}%)</span>
      {chosen > 0 && cl.dropPct > 0 && <span className={`rt-pop-s ${cl.dropPct >= 25 ? "hold" : ""}`}>{cl.dropPct}% fewer than the station before</span>}
    </div>}
  </div>;
}
