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
  // extra detail (drawn after everything else, so the layout above never shifts for existing seeds)
  const blotches = Array.from({ length: Math.ceil(h / 90) + 1 }, () => ({ x: r() * W, y: y0 + r() * h, rx: 50 + r() * 70, ry: 34 + r() * 50, dark: r() > 0.5 }));
  const tufts: { x: number; y: number; s: number; k: number }[] = [];
  for (let t = 0; t < 400 && tufts.length < Math.ceil(h / (lite ? 16 : 7)); t++) { const x = r() * W, y = y0 + r() * h; if (!near(x, y, 24) && !trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r)) tufts.push({ x, y, s: 0.7 + r() * 0.7, k: r() }); }
  const bushes: { x: number; y: number; r: number; c: number }[] = [];
  for (let t = 0; t < 120 && bushes.length < Math.ceil(h / (lite ? 90 : 55)); t++) { const x = r() * W, y = y0 + r() * h, rad = 4 + r() * 4; if (near(x, y, 26 + rad) || trees.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad) || (pond && Math.hypot((pond.x - x) / (pond.rx + 10), (pond.y - y) / (pond.ry + 10)) < 1)) continue; bushes.push({ x, y, r: rad, c: Math.floor(r() * theme.leaf.length) }); }
  const reeds = pond ? Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (0.05 + 0.9 * (i / 6)) + r() * 0.25; return { x: pond!.x + Math.cos(a) * (pond!.rx + 1.5), y: pond!.y + Math.sin(a) * (pond!.ry + 1.5), hgt: 7 + r() * 6, lean: (r() - 0.5) * 4 }; }) : [];
  const pads = pond ? Array.from({ length: 3 }, () => ({ x: pond!.x + (r() - 0.5) * pond!.rx * 1.2, y: pond!.y + (r() - 0.5) * pond!.ry * 1.1, s: 2.4 + r() * 1.8, a: r() * 6 })) : [];
  return { fields, trees, pond, flowers, rocks, clouds, blotches, tufts, bushes, reeds, pads, y0, y1, h };
}
export type Scene = ReturnType<typeof scenery>;

const SH = "#0b2a12";
const Plant1 = ({ t, id }: { t: Tree; id: string }) => {
  const { x, y, r } = t;
  if (t.kind === "cactus") { const w = r * 0.72, hh = r * 2.1, top = y - hh / 2, g = `url(#cx-${id}-${t.c})`;
    return <g><ellipse cx={x + 3} cy={y + hh / 2} rx={w * 1.3} ry={w * 0.5} fill="#5a3d10" opacity=".22" />
      <rect x={x - w / 2 - r * 0.62} y={y - r * 0.2} width={r * 0.42} height={r * 0.95} rx={r * 0.21} fill={g} /><rect x={x - w / 2 - r * 0.62} y={y + r * 0.45} width={r * 0.62} height={r * 0.34} rx={r * 0.17} fill={g} />
      <rect x={x + w / 2 + r * 0.2} y={y - r * 0.55} width={r * 0.42} height={r * 0.95} rx={r * 0.21} fill={g} /><rect x={x + w / 2 - r * 0.02} y={y + r * 0.1} width={r * 0.62} height={r * 0.34} rx={r * 0.17} fill={g} />
      <rect x={x - w / 2} y={top} width={w} height={hh} rx={w / 2} fill={g} />
      {[-0.22, 0.12].map((o, i) => <line key={i} x1={x + w * o} x2={x + w * o} y1={top + 4} y2={top + hh - 4} stroke="#1d4a2a" strokeWidth=".6" opacity=".35" />)}
      {[0.2, 0.45, 0.7].map((o, i) => <circle key={i} cx={x + (i % 2 ? 1 : -1) * w * 0.12} cy={top + hh * o} r=".7" fill="#fff6c8" opacity=".8" />)}</g>; }
  if (t.kind === "pine" || t.kind === "snowpine") { const s = r * 1.05, snow = t.kind === "snowpine", g = `url(#pn-${id}-${t.c})`;
    const tier = (cy: number, wd: number, hg: number) => <g key={cy}><polygon points={`${x},${cy - hg} ${x + wd},${cy} ${x - wd},${cy}`} fill={g} />
      <path d={`M${x - wd} ${cy} Q${x} ${cy + hg * 0.28} ${x + wd} ${cy}`} fill="#000" opacity=".16" />
      {snow && <path d={`M${x} ${cy - hg} L${x + wd * 0.55} ${cy - hg * 0.4} Q${x + wd * 0.25} ${cy - hg * 0.28} ${x} ${cy - hg * 0.42} Q${x - wd * 0.25} ${cy - hg * 0.28} ${x - wd * 0.55} ${cy - hg * 0.4} Z`} fill="#fff" opacity=".95" />}</g>;
    return <g><ellipse cx={x + s * 0.55} cy={y + s * 0.95} rx={s * 1.05} ry={s * 0.3} fill={snow ? "#5c7c92" : SH} opacity=".22" /><rect x={x - s * 0.1} y={y + s * 0.55} width={s * 0.2} height={s * 0.45} fill="#5a3e2a" />
      {tier(y + s * 0.8, s * 1.05, s * 0.9)}{tier(y + s * 0.25, s * 0.85, s * 0.85)}{tier(y - s * 0.3, s * 0.62, s * 0.8)}</g>; }
  if (t.kind === "poplar") { const g = `url(#lf-${id}-${t.c})`, hh = r * 2.5, w = r * 0.62;
    return <g><ellipse cx={x + r * 0.5} cy={y + hh * 0.42} rx={r * 0.9} ry={r * 0.3} fill={SH} opacity=".24" /><rect x={x - 0.7} y={y + hh * 0.3} width="1.4" height={hh * 0.16} fill="#5a3e2a" />
      <path d={`M${x} ${y - hh * 0.55} C${x + w * 1.5} ${y - hh * 0.3} ${x + w * 1.3} ${y + hh * 0.3} ${x} ${y + hh * 0.36} C${x - w * 1.3} ${y + hh * 0.3} ${x - w * 1.5} ${y - hh * 0.3} ${x} ${y - hh * 0.55}Z`} fill={g} />
      <path d={`M${x - w * 0.2} ${y - hh * 0.45} C${x - w * 0.9} ${y - hh * 0.2} ${x - w * 0.9} ${y + hh * 0.15} ${x - w * 0.3} ${y + hh * 0.25}`} stroke="#fff" strokeOpacity=".2" strokeWidth={r * 0.2} fill="none" strokeLinecap="round" /></g>; }
  const g = `url(#lf-${id}-${t.c})`, lobes: [number, number, number][] = [[-0.5, 0.2, 0.58], [0.5, 0.15, 0.6], [-0.25, -0.35, 0.62], [0.3, -0.3, 0.6], [0, 0.05, 0.78]];
  return <g><ellipse cx={x + r * 0.45} cy={y + r * 0.9} rx={r * 1.1} ry={r * 0.36} fill={SH} opacity=".24" /><path d={`M${x - r * 0.1} ${y + r * 0.95} L${x - r * 0.06} ${y + r * 0.2} L${x + r * 0.06} ${y + r * 0.2} L${x + r * 0.1} ${y + r * 0.95} Z`} fill="#5a3e2a" />
    {lobes.map(([dx, dy, k], i) => <circle key={i} cx={x + dx * r} cy={y + dy * r} r={r * k} fill={g} />)}
    <ellipse cx={x + r * 0.1} cy={y + r * 0.55} rx={r * 0.8} ry={r * 0.3} fill={SH} opacity=".13" />
    <ellipse cx={x - r * 0.3} cy={y - r * 0.45} rx={r * 0.34} ry={r * 0.2} fill="#fff" opacity=".2" /><circle cx={x + r * 0.35} cy={y - r * 0.1} r={r * 0.09} fill="#fff" opacity=".12" />{(Math.round(x * 7 + y * 3) % 5 === 0) && <circle cx={x + r * 0.2} cy={y - r * 0.2} r={r * 0.85} fill="#ffd34d" opacity=".16" />}</g>;
};

const blade = (x: number, y: number, s: number, k: number) => { const h = 4 * s; return `M${x} ${y} q${-1 - k} ${-h * 0.6} ${-1.8 - k * 1.4} ${-h} M${x} ${y} q${0.3} ${-h * 0.7} ${0.4 + k} ${-h * 1.2} M${x} ${y} q${1} ${-h * 0.5} ${2 + k} ${-h * 0.85}`; };
const darker = (hex: string) => { const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.round(v * 0.78)).toString(16).padStart(2, "0"); return `#${f((n >> 16) & 255)}${f((n >> 8) & 255)}${f(n & 255)}`; };

/** The static country (never re-rendered while the train moves or a card opens). */
export const Country = memo(function Country({ geo, id, sc, theme }: { geo: Geo; id: string; sc: Scene; theme: Theme }) {
  const P = sc.pond, grass = darker(theme.base), noisy = sc.h < 1400, desert = theme.id === "desert", snow = !!theme.frozen;
  return <>
    <defs>
      <pattern id={`m-${id}`} width="340" height="26" patternUnits="userSpaceOnUse"><rect width="340" height="13" fill="#fff" opacity={theme.stripe * 0.7} /></pattern>
      <linearGradient id={`sun-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7d0" stopOpacity=".2" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#0a1a40" stopOpacity=".16" /></linearGradient>
      <radialGradient id={`bl-l-${id}`}><stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <radialGradient id={`bl-d-${id}`}><stop offset="0" stopColor={snow ? "#8fb0c8" : "#0b3a1a"} stopOpacity=".16" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      {theme.leaf.map((l, i) => <g key={i}>
        <radialGradient id={`lf-${id}-${i}`} cx=".35" cy=".3" r=".85"><stop offset="0" stopColor={l[1]} /><stop offset=".7" stopColor={l[0]} /><stop offset="1" stopColor={darker(l[0])} /></radialGradient>
        <linearGradient id={`pn-${id}-${i}`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={l[1]} /><stop offset=".55" stopColor={l[0]} /><stop offset="1" stopColor={darker(l[0])} /></linearGradient>
        <linearGradient id={`cx-${id}-${i}`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={l[1]} /><stop offset=".5" stopColor={l[0]} /><stop offset="1" stopColor={darker(l[0])} /></linearGradient></g>)}
      <radialGradient id={`pw-${id}`} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor={theme.water.fill} stopOpacity=".78" /><stop offset=".75" stopColor={theme.water.fill} /><stop offset="1" stopColor={darker(theme.water.fill)} /></radialGradient>
      <radialGradient id={`rk-${id}`} cx=".35" cy=".3" r=".9"><stop offset="0" stopColor="#c9cfcf" /><stop offset="1" stopColor="#7d8585" /></radialGradient>
      <radialGradient id={`bs-${id}`} cx=".35" cy=".3" r=".9"><stop offset="0" stopColor={theme.leaf[0][1]} /><stop offset="1" stopColor={darker(theme.leaf[0][0])} /></radialGradient>
      {noisy && <filter id={`nz-${id}`} x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.18" /></filter>}
    </defs>
    <g className="rt-bg" data-theme={theme.id}><rect x="0" y={sc.y0} width={W} height={sc.h + 1} fill={theme.base} />
      {sc.blotches.map((b, i) => <ellipse key={i} cx={b.x} cy={b.y} rx={b.rx} ry={b.ry} fill={`url(#bl-${b.dark ? "d" : "l"}-${id})`} />)}
      <rect x="0" y={sc.y0} width={W} height={sc.h + 1} fill={`url(#m-${id})`} />
      {noisy && <rect x="0" y={sc.y0} width={W} height={sc.h + 1} filter={`url(#nz-${id})`} opacity=".16" />}
      {sc.fields.map((f, i) => <g key={i}><rect x={f.x + 1.5} y={f.y + 2.5} width={f.w} height={f.h} rx="5" fill="#000" opacity=".1" /><rect x={f.x} y={f.y} width={f.w} height={f.h} rx="5" fill={f.c} /><rect x={f.x} y={f.y} width={f.w} height={f.h} rx="5" fill="none" stroke={theme.furrow} strokeWidth="1.6" opacity=".9" />
        {Array.from({ length: Math.floor(f.h / 6) }, (_, j) => <line key={j} x1={f.x + 3} x2={f.x + f.w - 3} y1={f.y + 4 + j * 6} y2={f.y + 4 + j * 6} stroke={theme.furrow} strokeWidth="1.8" strokeLinecap="round" opacity={j % 2 ? 0.55 : 0.85} />)}</g>)}
      {sc.tufts.length > 0 && <path d={sc.tufts.map((u) => blade(u.x, u.y, u.s, u.k)).join(" ")} stroke={desert ? "#b9954f" : snow ? "#a9c4d8" : grass} strokeWidth=".9" strokeLinecap="round" fill="none" opacity=".75" />}
      {P && <g><ellipse cx={P.x + 1.5} cy={P.y + 2.5} rx={P.rx + 6} ry={P.ry + 6} fill="#000" opacity=".08" /><ellipse cx={P.x} cy={P.y} rx={P.rx + 5} ry={P.ry + 5} fill={theme.water.rim} opacity=".55" /><ellipse cx={P.x} cy={P.y} rx={P.rx + 2.6} ry={P.ry + 2.6} fill={theme.water.rim} />
        <ellipse cx={P.x} cy={P.y} rx={P.rx} ry={P.ry} fill={`url(#pw-${id})`} /><ellipse cx={P.x} cy={P.y + 1} rx={P.rx - 1} ry={P.ry - 1} fill="none" stroke="#000" strokeWidth="2" opacity=".1" />
        {snow ? <path d={`M${P.x - P.rx * 0.6} ${P.y - P.ry * 0.2} l${P.rx * 0.5} ${P.ry * 0.5} l${P.rx * 0.35} -${P.ry * 0.3} M${P.x + P.rx * 0.1} ${P.y - P.ry * 0.7} l${P.rx * 0.2} ${P.ry * 0.7}`} stroke="#fff" strokeWidth="1.1" fill="none" opacity=".85" />
          : <><ellipse className="rt-ripple" cx={P.x + P.rx * 0.15} cy={P.y + P.ry * 0.1} rx={P.rx * 0.5} ry={P.ry * 0.5} fill="none" stroke="#fff" strokeWidth="1" />
            <path d={`M${P.x - P.rx * 0.5} ${P.y + P.ry * 0.35} q${P.rx * 0.2} -2 ${P.rx * 0.4} 0 M${P.x + P.rx * 0.1} ${P.y - P.ry * 0.4} q${P.rx * 0.2} -2 ${P.rx * 0.4} 0`} stroke="#fff" strokeWidth=".8" fill="none" opacity=".55" strokeLinecap="round" />
            {!desert && sc.pads.map((l, i) => <g key={i}><ellipse cx={l.x} cy={l.y} rx={l.s} ry={l.s * 0.62} fill="#3f9a4e" /><path d={`M${l.x} ${l.y} L${l.x + Math.cos(l.a) * l.s} ${l.y + Math.sin(l.a) * l.s * 0.62}`} stroke={theme.water.fill} strokeWidth=".8" /></g>)}</>}
        <ellipse cx={P.x - P.rx * 0.32} cy={P.y - P.ry * 0.3} rx={P.rx * 0.38} ry={P.ry * 0.2} fill="#fff" opacity={theme.water.shine} />
        {!snow && sc.reeds.map((e, i) => <g key={i} stroke={desert ? "#8a9a4a" : "#3e8a4a"} strokeWidth="1" strokeLinecap="round" fill="none"><path d={`M${e.x} ${e.y} q${e.lean * 0.4} ${-e.hgt * 0.5} ${e.lean} ${-e.hgt}`} /><path d={`M${e.x + 1.2} ${e.y} q${-e.lean * 0.3} ${-e.hgt * 0.45} ${-e.lean * 0.5} ${-e.hgt * 0.8}`} /><ellipse cx={e.x + e.lean} cy={e.y - e.hgt} rx=".9" ry="2" fill="#7a5a36" stroke="none" /></g>)}</g>}
      {sc.flowers.map((f, i) => <g key={i}>{[0, 1, 2, 3, 4].map((q) => <circle key={q} cx={f.x + Math.cos((q / 5) * 6.283) * 1.3} cy={f.y + Math.sin((q / 5) * 6.283) * 1.3} r=".95" fill={f.c} />)}<circle cx={f.x} cy={f.y} r=".8" fill={f.c === "#ffd166" ? "#e08a1e" : "#ffd166"} /></g>)}
      {sc.rocks.map((k, i) => { const p = (a: number, j: number, d: number) => `${(k.x + Math.cos(a) * k.s * (0.75 + k.j[j] * 0.35)).toFixed(1)},${(k.y + Math.sin(a) * k.s * 0.62 * (0.75 + k.j[j] * 0.35) + d).toFixed(1)}`;
        return <g key={i}><ellipse cx={k.x + 3} cy={k.y + k.s * 0.5} rx={k.s * 1.05} ry={k.s * 0.3} fill="#000" opacity=".2" /><polygon points={[0, 1, 2, 3, 4, 5].map((q) => p((q / 6) * Math.PI * 2, q, 0)).join(" ")} fill={`url(#rk-${id})`} stroke="#5f6767" strokeWidth=".5" strokeLinejoin="round" /><polygon points={`${k.x},${k.y - k.s * 0.55} ${p(0.2, 1, 0)} ${p(2.6, 3, 0)}`} fill="#dfe4e4" opacity=".55" /></g>; })}
      {sc.bushes.map((b, i) => <g key={i}><ellipse cx={b.x + 1.5} cy={b.y + b.r * 0.7} rx={b.r * 1.1} ry={b.r * 0.4} fill={SH} opacity=".2" /><circle cx={b.x - b.r * 0.5} cy={b.y} r={b.r * 0.7} fill={`url(#bs-${id})`} /><circle cx={b.x + b.r * 0.5} cy={b.y} r={b.r * 0.7} fill={`url(#bs-${id})`} /><circle cx={b.x} cy={b.y - b.r * 0.3} r={b.r * 0.8} fill={`url(#bs-${id})`} /><circle cx={b.x - b.r * 0.2} cy={b.y - b.r * 0.55} r={b.r * 0.25} fill="#fff" opacity=".18" />
        {!desert && !snow && b.c === 0 && [[-0.4, -0.1], [0.3, -0.45], [0.5, 0.1]].map(([a, c], q) => <circle key={q} cx={b.x + a * b.r} cy={b.y + c * b.r} r=".9" fill="#ff7a8a" />)}</g>)}
      {sc.tufts.filter((_, i) => i % 6 === 0).map((u, i) => <g key={i}><ellipse cx={u.x + 5} cy={u.y + 2} rx="1.6" ry="1" fill="#8d9494" /><ellipse cx={u.x + 4.8} cy={u.y + 1.6} rx="1" ry=".6" fill="#c3c9c9" /><ellipse cx={u.x + 8} cy={u.y + 3} rx="1.1" ry=".7" fill="#8d9494" /></g>)}
      {[...sc.trees].sort((a, b) => a.y - b.y).map((tr, i) => <Plant1 key={i} t={tr} id={id} />)}
      <rect x="0" y={sc.y0} width={W} height={sc.h + 1} fill={`url(#sun-${id})`} pointerEvents="none" /></g>
  </>;
});

/** Soft clouds drifting over the map (drawn above the train, very light). */
export const Clouds = memo(function Clouds({ sc, theme }: { sc: Scene; theme: Theme }) {
  return <g className="rt-clouds" aria-hidden="true" opacity={theme.cloudOpacity}>{sc.clouds.map((c, k) => <g key={k} className="rt-cloud" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
    <g transform={`translate(0 ${c.y}) scale(${c.s})`}><g opacity=".1" transform="translate(10 26)"><ellipse rx="26" ry="9" fill="#000" /><ellipse cx="22" cy="2" rx="18" ry="7" fill="#000" /></g>
      <ellipse rx="26" ry="9" fill={theme.cloud} /><ellipse cx="-14" cy="3" rx="16" ry="7" fill={theme.cloud} /><ellipse cx="22" cy="2" rx="18" ry="7" fill={theme.cloud} /><ellipse cx="4" cy="-5" rx="14" ry="7" fill={theme.cloud} /></g></g>)}</g>;
});
