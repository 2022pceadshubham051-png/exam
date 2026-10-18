/** Subject radar: your rating per subject against your target. Real ratings only; needs 3+ rated subjects. */
export default function Radar({ items, target }: { items: { name: string; score: number }[]; target: number }) {
  const n = items.length; if (n < 3) return null;
  const S = 260, C = S / 2, R = 88;
  const pt = (i: number, v: number): [number, number] => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return [C + Math.cos(a) * R * (v / 100), C + Math.sin(a) * R * (v / 100)]; };
  const poly = (f: (i: number) => number) => items.map((_, i) => pt(i, f(i)).join(",")).join(" ");
  let weak = 0; items.forEach((s, i) => { if (s.score < items[weak].score) weak = i; });
  const label = (i: number) => { const [x, y] = pt(i, 122); return { x, y, anchor: x < C - 6 ? "end" : x > C + 6 ? "start" : "middle" } as const; };
  return <figure className="radar" style={{ margin: 0 }}>
    <svg viewBox={`0 0 ${S + 80} ${S + 20}`} role="img" aria-label={`Subject ratings out of 100: ${items.map((s) => `${s.name} ${s.score}`).join(", ")}. Target ${target}. Weakest: ${items[weak].name}.`}>
      <g transform="translate(40 10)">
        {[25, 50, 75, 100].map((r) => <polygon key={r} points={poly(() => r)} fill="none" stroke="var(--border)" strokeWidth="1" />)}
        {items.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth="1" />; })}
        <polygon points={poly(() => target)} fill="none" stroke="var(--gold-text)" strokeWidth="1.5" strokeDasharray="4 4" />
        <polygon className="radar-shape" points={poly((i) => items[i].score)} fill="color-mix(in srgb, var(--brand) 22%, transparent)" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" />
        {items.map((s, i) => { const [x, y] = pt(i, s.score); return <circle key={i} className="radar-dot" cx={x} cy={y} r={i === weak ? 5 : 3.5} fill={i === weak ? "var(--bad)" : "var(--brand)"} stroke="var(--surface)" strokeWidth="1.5" />; })}
        {items.map((s, i) => { const l = label(i); return <text key={i} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle" fontSize="11" fontWeight={i === weak ? 700 : 500} fill={i === weak ? "var(--bad)" : "var(--muted)"}>{s.name.length > 14 ? s.name.slice(0, 13) + "…" : s.name}</text>; })}
      </g>
    </svg>
    <figcaption className="sub" style={{ textAlign: "center" }}>Solid = your rating · dashed = target {target} · red dot = weakest: <b>{items[weak].name}</b></figcaption>
  </figure>;
}
