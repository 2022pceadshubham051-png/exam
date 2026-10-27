import { memo } from "react";
import type { Plant, Theme } from "../lib/themes";

/* ------------------------------------------------------------------ geometry (pure maths, no DOM) */
export const W = 340, STEP = 96, PAD = 58, SEG_SAMPLES = 40;
export type P = { x: number; y: number };
export type Geo = { H: number; nodes: (P & { s: number })[]; segs: string[]; full: string; pts: (P & { s: number })[]; total: number };
export const mapH = (n: number) => Math.max(230, PAD * 2 + (n - 1) * STEP);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const cubic = (a: P, b: P, c: P, d: P, t: number): P => { const u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y }; };

/** A zig-zag of S-curves: station i sits left or right, the line swings smoothly between them and runs off the map at both ends. */
export function makeGeo(n: number): Geo {
  const H = mapH(n), top = n === 1 ? H / 2 : PAD;
  const nodes0: P[] = Array.from({ length: n }, (_, i) => ({ x: (i % 2 ? 252 : 88) + [-12, 0, 12][i % 3] * (i % 2 ? -1 : 1), y: top + i * STEP }));
  const list: P[] = [{ x: nodes0[0].x, y: nodes0[0].y - 80 }, ...nodes0, { x: nodes0[n - 1].x, y: nodes0[n - 1].y + 80 }];
  const segs: string[] = [], pts: (P & { s: number })[] = [], nodes: (P & { s: number })[] = []; let s = 0, prev: P | null = null;
  for (let k = 0; k <= n; k++) {
    const a = list[k], b = list[k + 1], d = (b.y - a.y) * 0.55, c1 = { x: a.x, y: a.y + d }, c2 = { x: b.x, y: b.y - d };
    segs.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    for (let j = k === 0 ? 0 : 1; j <= SEG_SAMPLES; j++) { const p = cubic(a, c1, c2, b, j / SEG_SAMPLES); if (prev) s += Math.hypot(p.x - prev.x, p.y - prev.y); prev = p; pts.push({ ...p, s }); }
    if (k < n) nodes.push({ ...nodes0[k], s });
  }
  // one continuous path (the glowing trail behind the train is drawn along it)
  const full = segs.map((d, k) => (k === 0 ? d : d.replace(/^M[^C]*/, ""))).join(" ");
  return { H, nodes, segs, full, pts, total: s };
}

/** Point at distance `s` along the line; past either end it carries straight on, so the train can roll in from outside the map. */
export function at(g: Geo, s: number): P {
  const p = g.pts; if (s <= 0) { const d = Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) || 1; return { x: p[0].x + ((p[1].x - p[0].x) / d) * s, y: p[0].y + ((p[1].y - p[0].y) / d) * s }; }
  const m = p.length; if (s >= g.total) { const a = p[m - 2], b = p[m - 1], d = Math.hypot(b.x - a.x, b.y - a.y) || 1, e = s - g.total; return { x: b.x + ((b.x - a.x) / d) * e, y: b.y + ((b.y - a.y) / d) * e }; }
  let lo = 0, hi = m - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p[mid].s <= s) lo = mid; else hi = mid; }
  const a = p[lo], b = p[hi], k = (s - a.s) / ((b.s - a.s) || 1); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
export const heading = (g: Geo, s: number) => { const a = at(g, s - 5), b = at(g, s + 5); return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI; };

/** Horizontal slices of a long map, one per subject: each slice runs from halfway to the previous subject's last station to halfway to the next one's first. */
export type Band = { y0: number; y1: number };
export function bandsFor(g: Geo, counts: number[]): Band[] {
  const out: Band[] = []; let i = 0;
  counts.forEach((c, k) => { const first = g.nodes[i], last = g.nodes[i + c - 1], prevLast = g.nodes[i - 1], nextFirst = g.nodes[i + c];
    out.push({ y0: k === 0 ? 0 : (prevLast.y + first.y) / 2, y1: k === counts.length - 1 ? g.H : (last.y + nextFirst.y) / 2 }); i += c; });
  return out;
}

/* ------------------------------------------------------------------ scenery */
export const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

type Tree = { x: number; y: number; r: number; c: number; kind: Plant };
/** The country around the line, seeded by `seed` so it never changes between visits. `band` limits it to a slice of a long map; `lite` draws fewer pieces (for the long all-subjects map). */
export function scenery(g: Geo, seed: string, theme: Theme, band?: Band, lite = false) {
  const y0 = band?.y0 ?? 0, y1 = band?.y1 ?? g.H, h = y1 - y0, r = rng(hash(seed));
  const pts = g.pts.filter((p, i) => i % 3 === 0 && p.y >= y0 - 90 && p.y <= y1 + 90), near = (x: number, y: number, d: number) => pts.some((p) => Math.hypot(p.x - x, p.y - y) < d);
  const fields: { x: number; y: number; w: number; h: number; c: string }[] = [], trees: Tree[] = [], flowers: { x: number; y: number; c: string }[] = [], rocks: { x: number; y: number; s: number; j: number[] }[] = []; let pond: { x: number; y: number; rx: number; ry: number } | null = null;
  for (let i = 0; i < Math.ceil(h / (lite ? 220 : 150)) + 1; i++) { const w = 58 + r() * 40, fh = 40 + r() * 34, x = r() * (W - w), y = y0 + r() * Math.max(1, h - fh); if (!near(x + w / 2, y + fh / 2, 64) && !near(x, y, 40) && !near(x + w, y + fh, 40)) fields.push({ x, y, w, h: fh, c: theme.patch[r() > 0.5 ? 0 : 1] }); }
  for (let t = 0; t < 40 && !pond; t++) { const x = 30 + r() * (W - 60), y = y0 + 30 + r() * Math.max(1, h - 60); if (!near(x, y, 62)) pond = { x, y, rx: 24 + r() * 10, ry: 14 + r() * 6 }; }
  const treeMax = Math.ceil(h / (lite ? 24 : 15));
  for (let t = 0; t < (lite ? 260 : 420) && trees.length < treeMax; t++) { const x = r() * W, y = y0 + r() * h, rad = 8 + r() * 7;
    if (near(x, y, 40 + rad) || trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad - 2) || (pond && Math.hypot((pond.x - x) / (pond.rx + 12), (pond.y - y) / (pond.ry + 12)) < 1)) continue;
    trees.push({ x, y, r: rad, c: Math.floor(r() * theme.leaf.length), kind: theme.plants[Math.floor(r() * theme.plants.length)] }); }
  if (theme.boulders) for (let t = 0; t < 90 && rocks.length < Math.ceil(h / 120); t++) { const x = r() * W, y = y0 + r() * h, s = 9 + r() * 9;
    if (near(x, y, 38 + s) || trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + s) || (pond && Math.hypot((pond.x - x) / (pond.rx + 14), (pond.y - y) / (pond.ry + 14)) < 1)) continue; rocks.push({ x, y, s, j: [r(), r(), r(), r(), r(), r()] }); }
  const fMax = band ? Math.round((lite ? 0.03 : 0.05) * h) : 34;
  for (let t = 0; t < 160 && flowers.length < fMax; t++) { const x = r() * W, y = y0 + r() * h; if (!near(x, y, 30) && !trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 2)) flowers.push({ x, y, c: theme.dots[Math.floor(r() * theme.dots.length)] }); }
  const clouds = Array.from({ length: Math.max(1, Math.min(4, Math.round(h / 380))) }, (_, k) => ({ y: y0 + 40 + r() * Math.max(1, h - 80), s: 0.8 + r() * 0.7, dur: 70 + k * 21 + r() * 20, delay: -(r() * 70) }));
  return { fields, trees, pond, flowers, rocks, clouds, y0, y1, h };
}
export type Scene = ReturnType<typeof scenery>;

const Plant1 = ({ t, leaf }: { t: Tree; leaf: [string, string] }) => {
  const { x, y, r } = t;
  if (t.kind === "cactus") { const w = r * 0.72, hh = r * 2.1, top = y - hh / 2;
    return <g><ellipse cx={x + 3} cy={y + hh / 2} rx={w * 1.1} ry={w * 0.45} fill="#000" opacity=".16" />
      <rect x={x - w / 2 - r * 0.62} y={y - r * 0.2} width={r * 0.42} height={r * 0.95} rx={r * 0.21} fill={leaf[0]} /><rect x={x - w / 2 - r * 0.62} y={y + r * 0.45} width={r * 0.62} height={r * 0.34} rx={r * 0.17} fill={leaf[0]} />
      <rect x={x + w / 2 + r * 0.2} y={y - r * 0.55} width={r * 0.42} height={r * 0.95} rx={r * 0.21} fill={leaf[0]} /><rect x={x + w / 2 - r * 0.02} y={y + r * 0.1} width={r * 0.62} height={r * 0.34} rx={r * 0.17} fill={leaf[0]} />
      <rect x={x - w / 2} y={top} width={w} height={hh} rx={w / 2} fill={leaf[0]} /><rect x={x - w * 0.18} y={top + 2} width={w * 0.22} height={hh - 4} rx={w * 0.11} fill={leaf[1]} opacity=".75" /></g>; }
  if (t.kind === "pine" || t.kind === "snowpine") { const s = r * 1.05, snow = t.kind === "snowpine";
    return <g><ellipse cx={x + 3} cy={y + s * 0.95} rx={s * 0.95} ry={s * 0.32} fill="#000" opacity=".16" /><rect x={x - s * 0.1} y={y + s * 0.55} width={s * 0.2} height={s * 0.45} fill="#6b4a33" />
      <polygon points={`${x},${y - s * 0.2} ${x + s * 1.05},${y + s * 0.78} ${x - s * 1.05},${y + s * 0.78}`} fill={leaf[0]} /><polygon points={`${x},${y - s * 0.2} ${x + s * 1.05},${y + s * 0.78} ${x + s * 0.15},${y + s * 0.78}`} fill={leaf[1]} opacity=".55" />
      <polygon points={`${x},${y - s * 1.2} ${x + s * 0.8},${y + s * 0.1} ${x - s * 0.8},${y + s * 0.1}`} fill={leaf[0]} /><polygon points={`${x},${y - s * 1.2} ${x + s * 0.8},${y + s * 0.1} ${x + s * 0.1},${y + s * 0.1}`} fill={leaf[1]} opacity=".55" />
      {snow && <><polygon points={`${x},${y - s * 1.2} ${x + s * 0.34},${y - s * 0.7} ${x - s * 0.34},${y - s * 0.7}`} fill="#fff" /><polygon points={`${x},${y - s * 0.2} ${x + s * 0.5},${y + s * 0.3} ${x - s * 0.5},${y + s * 0.3}`} fill="#fff" opacity=".92" /></>}</g>; }
  return <g><ellipse cx={x + 3} cy={y + 4} rx={r} ry={r * 0.9} fill="#000" opacity=".16" /><circle cx={x} cy={y} r={r} fill={leaf[0]} /><circle cx={x - r * 0.22} cy={y - r * 0.25} r={r * 0.62} fill={leaf[1]} /><circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.22} fill="#fff" opacity=".22" /></g>;
};

/** The static country (never re-rendered while the train moves or a card opens). */
export const Country = memo(function Country({ geo, id, sc, theme }: { geo: Geo; id: string; sc: Scene; theme: Theme }) {
  return <>
    <defs><pattern id={`m-${id}`} width="340" height="26" patternUnits="userSpaceOnUse"><rect width="340" height="13" fill="#fff" opacity={theme.stripe} /></pattern></defs>
    <g className="rt-bg" data-theme={theme.id}><rect x="0" y={sc.y0} width={W} height={sc.h + 1} fill={theme.base} /><rect x="0" y={sc.y0} width={W} height={sc.h + 1} fill={`url(#m-${id})`} />
      {sc.fields.map((f, i) => <g key={i}><rect x={f.x} y={f.y} width={f.w} height={f.h} rx="5" fill={f.c} />{Array.from({ length: Math.floor(f.h / 7) }, (_, j) => <line key={j} x1={f.x + 3} x2={f.x + f.w - 3} y1={f.y + 5 + j * 7} y2={f.y + 5 + j * 7} stroke={theme.furrow} strokeWidth="1.4" opacity=".7" />)}</g>)}
      {sc.pond && <g><ellipse cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx + 3} ry={sc.pond.ry + 3} fill={theme.water.rim} /><ellipse cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx} ry={sc.pond.ry} fill={theme.water.fill} />
        {theme.frozen ? <path d={`M${sc.pond.x - sc.pond.rx * 0.6} ${sc.pond.y - sc.pond.ry * 0.2} l${sc.pond.rx * 0.5} ${sc.pond.ry * 0.5} l${sc.pond.rx * 0.35} -${sc.pond.ry * 0.3} M${sc.pond.x + sc.pond.rx * 0.1} ${sc.pond.y - sc.pond.ry * 0.7} l${sc.pond.rx * 0.2} ${sc.pond.ry * 0.7}`} stroke="#fff" strokeWidth="1.2" fill="none" opacity=".85" />
          : <ellipse className="rt-ripple" cx={sc.pond.x} cy={sc.pond.y} rx={sc.pond.rx * 0.55} ry={sc.pond.ry * 0.55} fill="none" stroke="#fff" strokeWidth="1.2" />}
        <ellipse cx={sc.pond.x - sc.pond.rx * 0.3} cy={sc.pond.y - sc.pond.ry * 0.25} rx={sc.pond.rx * 0.4} ry={sc.pond.ry * 0.22} fill="#fff" opacity={theme.water.shine} /></g>}
      {sc.flowers.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r="1.6" fill={f.c} />)}
      {sc.rocks.map((k, i) => { const p = (a: number, j: number, d: number) => `${(k.x + Math.cos(a) * k.s * (0.75 + k.j[j] * 0.35)).toFixed(1)},${(k.y + Math.sin(a) * k.s * 0.62 * (0.75 + k.j[j] * 0.35) + d).toFixed(1)}`;
        return <g key={i}><ellipse cx={k.x + 3} cy={k.y + k.s * 0.5} rx={k.s} ry={k.s * 0.3} fill="#000" opacity=".16" /><polygon points={[0, 1, 2, 3, 4, 5].map((q) => p((q / 6) * Math.PI * 2, q, 0)).join(" ")} fill="#8d9494" /><polygon points={`${k.x},${k.y - k.s * 0.55} ${p(0.2, 1, 0)} ${p(2.6, 3, 0)}`} fill="#b3baba" /></g>; })}
      {sc.trees.map((tr, i) => <Plant1 key={i} t={tr} leaf={theme.leaf[tr.c]} />)}</g>
  </>;
});

/** Soft clouds drifting over the map (drawn above the train, very light). */
export const Clouds = memo(function Clouds({ sc, theme }: { sc: Scene; theme: Theme }) {
  return <g className="rt-clouds" aria-hidden="true" opacity={theme.cloudOpacity}>{sc.clouds.map((c, k) => <g key={k} className="rt-cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
    <g transform={`translate(0 ${c.y}) scale(${c.s})`}><g opacity=".1" transform="translate(10 26)"><ellipse rx="26" ry="9" fill="#000" /><ellipse cx="22" cy="2" rx="18" ry="7" fill="#000" /></g>
      <ellipse rx="26" ry="9" fill={theme.cloud} /><ellipse cx="-14" cy="3" rx="16" ry="7" fill={theme.cloud} /><ellipse cx="22" cy="2" rx="18" ry="7" fill={theme.cloud} /><ellipse cx="4" cy="-5" rx="14" ry="7" fill={theme.cloud} /></g></g>)}</g>;
});
