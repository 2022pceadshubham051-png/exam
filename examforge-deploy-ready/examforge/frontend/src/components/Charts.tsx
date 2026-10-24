import { useEffect, useRef, useState } from "react";
// Small dependency-free SVG charts (replaces recharts, which was ~100 KB gzipped). Colours come from CSS variables, so every skin and dark mode works.
type Series = { key: string; name?: string; color: string };
const PAD = { l: 34, r: 10, t: 10, b: 26 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null), [w, setW] = useState(320);
  useEffect(() => { const el = ref.current; if (!el) return; setW(el.clientWidth || 320); const ro = new ResizeObserver(() => setW(el.clientWidth || 320)); ro.observe(el); return () => ro.disconnect(); }, []);
  return [ref, w] as const;
}
const nice = (max: number) => { if (max <= 5) return 5; const p = 10 ** Math.floor(Math.log10(max)), f = max / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
const Legend = ({ series }: { series: Series[] }) => series.length > 1 ? <ul className="ch-legend" aria-hidden="true">{series.map((s) => <li key={s.key}><i style={{ background: s.color }} />{s.name ?? s.key}</li>)}</ul> : null;

/** Multi-series line chart over labelled points. Hover or touch shows the values at that point. */
export function LineChartLite({ data, series, height = 260, max = 100 }: { data: Record<string, any>[]; series: Series[]; height?: number; max?: number }) {
  const [ref, w] = useWidth(), [hot, setHot] = useState<number | null>(null);
  const iw = Math.max(40, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b, n = data.length;
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1)), y = (v: number) => PAD.t + ih - (Math.max(0, Math.min(max, v)) / max) * ih;
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 44))));
  const move = (e: React.PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left - PAD.l; setHot(Math.max(0, Math.min(n - 1, Math.round(n <= 1 ? 0 : (px / iw) * (n - 1))))); };
  return <div ref={ref} className="ch" style={{ height }}>
    <svg width={w} height={height} role="img" aria-label={series.map((s) => s.name ?? s.key).join(", ")} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHot(null)}>
      {[0, 25, 50, 75, 100].map((g) => <g key={g}><line x1={PAD.l} x2={w - PAD.r} y1={y((g / 100) * max)} y2={y((g / 100) * max)} stroke="var(--border)" strokeDasharray="3 3" /><text x={PAD.l - 6} y={y((g / 100) * max) + 4} textAnchor="end" className="ch-t">{Math.round((g / 100) * max)}</text></g>)}
      {data.map((d, i) => i % step === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="ch-t">{d.label}</text>)}
      {series.map((s) => <g key={s.key}>
        <polyline fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" className="ch-line" points={data.map((d, i) => `${x(i)},${y(Number(d[s.key]) || 0)}`).join(" ")} />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(Number(d[s.key]) || 0)} r={hot === i ? 5.5 : 3.5} fill="var(--surface)" stroke={s.color} strokeWidth={2.5} />)}</g>)}
      {hot !== null && <line x1={x(hot)} x2={x(hot)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--border-strong)" />}
    </svg>
    {hot !== null && <div className="ch-tip" style={{ left: Math.min(Math.max(x(hot) - 60, 0), Math.max(0, w - 130)) }}><b>{data[hot].label}</b>{series.map((s) => <div key={s.key}><i style={{ background: s.color }} />{s.name ?? s.key}: <b>{data[hot][s.key]}</b></div>)}</div>}
    <Legend series={series} />
  </div>;
}

/** Grouped bar chart (one group per label). */
export function BarChartLite({ data, series, height = 230, integer = true }: { data: Record<string, any>[]; series: Series[]; height?: number; integer?: boolean }) {
  const [ref, w] = useWidth(), [hot, setHot] = useState<number | null>(null);
  const top = nice(Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const iw = Math.max(40, w - PAD.l - PAD.r), ih = height - PAD.t - PAD.b, gw = iw / Math.max(1, data.length), bw = Math.min(34, (gw * 0.7) / series.length);
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  return <div ref={ref} className="ch" style={{ height }}>
    <svg width={w} height={height} role="img" aria-label={series.map((s) => s.name ?? s.key).join(", ")} onPointerLeave={() => setHot(null)}>
      {[0, 0.5, 1].map((g) => <g key={g}><line x1={PAD.l} x2={w - PAD.r} y1={y(g * top)} y2={y(g * top)} stroke="var(--border)" strokeDasharray="3 3" /><text x={PAD.l - 6} y={y(g * top) + 4} textAnchor="end" className="ch-t">{integer ? Math.round(g * top) : +(g * top).toFixed(1)}</text></g>)}
      {data.map((d, i) => <g key={i} onPointerEnter={() => setHot(i)} onPointerDown={() => setHot(i)}>
        <rect x={PAD.l + i * gw} y={PAD.t} width={gw} height={ih} fill="transparent" />
        {series.map((s, j) => { const v = Number(d[s.key]) || 0, bx = PAD.l + i * gw + gw / 2 - (bw * series.length) / 2 + j * bw; return <rect key={s.key} x={bx + 1} y={y(v)} width={Math.max(1, bw - 2)} height={Math.max(0, PAD.t + ih - y(v))} rx={4} fill={s.color} opacity={hot === null || hot === i ? 1 : 0.55} className="ch-bar" />; })}
        <text x={PAD.l + i * gw + gw / 2} y={height - 6} textAnchor="middle" className="ch-t">{d.label}</text></g>)}
    </svg>
    {hot !== null && <div className="ch-tip" style={{ left: Math.min(Math.max(PAD.l + hot * gw + gw / 2 - 60, 0), Math.max(0, w - 130)), top: 4 }}><b>{data[hot].label}</b>{series.map((s) => <div key={s.key}><i style={{ background: s.color }} />{s.name ?? s.key}: <b>{data[hot][s.key]}</b></div>)}</div>}
    <Legend series={series} />
  </div>;
}
