import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { getSkin, type Skin } from "../lib/skin";

/** Current exam skin; re-renders when the exam or the student's override changes. */
export function useSkin(): Skin {
  const [s, set] = useState<Skin>(getSkin);
  useEffect(() => { const f = () => set(getSkin()); window.addEventListener("ef-skin", f); f(); return () => window.removeEventListener("ef-skin", f); }, []);
  return s;
}

/* Mini vehicles. All three are 64x34, drawn with gradients, highlights and real moving parts (spinning wheels, swinging rods, running legs) -
   the animation lives in motion.css (.wspin, .rod, .lg-*, .ar-*) and stops for reduced motion. The accent colours still follow the exam theme (--brand / --gold). */
const Wheel = ({ cx, cy, r, spin = true, spokes = 6 }: { cx: number; cy: number; r: number; spin?: boolean; spokes?: number }) => <g>
  <circle cx={cx} cy={cy} r={r} fill="#101318" /><circle cx={cx} cy={cy} r={r * 0.9} fill="#2a2f3a" />
  <g className={spin ? "wspin" : ""} style={{ transformOrigin: `${cx}px ${cy}px` }}>
    <circle cx={cx} cy={cy} r={r * 0.74} fill="#c9d0dc" /><circle cx={cx} cy={cy} r={r * 0.6} fill="#3a404d" />
    {Array.from({ length: spokes }, (_, i) => <line key={i} x1={cx} y1={cy} x2={cx} y2={cy - r * 0.68} stroke="#b4bccb" strokeWidth={r * 0.17} strokeLinecap="round" transform={`rotate(${(360 / spokes) * i} ${cx} ${cy})`} />)}
    <circle cx={cx} cy={cy} r={r * 0.3} fill="var(--gold)" /><circle cx={cx + r * 0.62} cy={cy} r={r * 0.1} fill="#ffe9a8" /></g>
  <path d={`M${cx - r * 0.8} ${cy - r * 0.35} A${r * 0.88} ${r * 0.88} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.86}`} stroke="#fff" strokeOpacity=".35" strokeWidth={r * 0.14} fill="none" strokeLinecap="round" /></g>;

/** Steam locomotive + passenger coach, side view: lit windows with passengers, headlight beam, rolling smoke. */
export function Train({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="efT-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".3" stopColor="#fff" stopOpacity="0" /><stop offset=".75" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".4" /></linearGradient>
      <linearGradient id="efT-bo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7b86a3" /><stop offset=".3" stopColor="#434b61" /><stop offset=".7" stopColor="#262b38" /><stop offset="1" stopColor="#10131a" /></linearGradient>
      <linearGradient id="efT-gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c9" /><stop offset="1" stopColor="#ffc95e" /></linearGradient>
      <linearGradient id="efT-rf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id="efT-hl"><stop offset="0" stopColor="#fffbd0" stopOpacity=".95" /><stop offset="1" stopColor="#fffbd0" stopOpacity="0" /></radialGradient>
      <linearGradient id="efT-bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff6c0" stopOpacity=".7" /><stop offset="1" stopColor="#fff6c0" stopOpacity="0" /></linearGradient>
      <radialGradient id="efT-sm"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".7" stopColor="#e6edf5" stopOpacity=".8" /><stop offset="1" stopColor="#cfd8e4" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="32" cy="32.8" rx="31.5" ry="1.3" fill="#000" opacity=".22" />
    {puff && <g className="puffs"><circle className="puff p1" cx="56.4" cy="5" r="2.8" fill="url(#efT-sm)" /><circle className="puff p2" cx="56.4" cy="5" r="2.8" fill="url(#efT-sm)" /><circle className="puff p3" cx="56.4" cy="5" r="2.8" fill="url(#efT-sm)" /><circle className="puff p4" cx="56.4" cy="5" r="2.4" fill="url(#efT-sm)" /></g>}
    <path className="tr-beam" d="M60 17.6 L64 14.4 V20.8 Z" fill="url(#efT-bm)" />
    {/* coach */}
    <path d="M1.6 26 V13 Q1.6 9.6 5 9.6 H24.6 Q28 9.6 28 13 V26 Z" fill="var(--brand)" /><path d="M1.6 12.2 Q1.6 9.6 5 9.6 H24.6 Q28 9.6 28 12.2 Z" fill="url(#efT-rf)" opacity=".8" />
    <rect x="1.6" y="20.4" width="26.4" height="2" fill="var(--gold)" /><rect x="1.6" y="22.4" width="26.4" height=".6" fill="#000" opacity=".2" />
    {[3.4, 10.4, 17.4].map((x, i) => <g key={i}><rect x={x - 0.7} y="12.6" width="6.2" height="6.2" rx="1.4" fill="#10131a" /><rect x={x} y="13.3" width="4.8" height="4.8" rx="1" fill="url(#efT-gl)" /><circle cx={x + 2.4} cy="16.7" r="1.15" fill="#4a3a30" opacity=".85" /><path d={`M${x + 0.6} 18.1 Q${x + 2.4} 15.9 ${x + 4.2} 18.1 Z`} fill="#2a3556" opacity=".8" /><rect x={x} y="13.3" width="4.8" height="1.5" fill="#fff" opacity=".4" /></g>)}
    <rect x="24.2" y="12.6" width="2.8" height="9.6" rx=".8" fill="#10131a" opacity=".35" /><rect x="24.8" y="13.2" width=".7" height="8.6" fill="#fff" opacity=".3" />
    <path d="M1.6 9.6 H28" stroke="#fff" strokeOpacity=".5" strokeWidth=".5" /><rect x="1.6" y="9.6" width="26.4" height="16.4" rx="2.4" fill="url(#efT-sh)" /><rect x="3" y="26" width="23.4" height="2.4" rx="1" fill="#1a1d25" />
    <rect x="28" y="24" width="3.4" height="1.6" fill="#2a2e38" /><circle cx="28.6" cy="24.8" r=".7" fill="#8b93a3" />
    {/* locomotive */}
    <path d="M34 24 V16.4 Q34 12.2 38.4 12.2 H55 Q59.6 12.2 59.6 16.6 V24 Z" fill="url(#efT-bo)" />
    <rect x="40.4" y="12.2" width="1.5" height="11.8" fill="var(--gold)" /><rect x="48" y="12.2" width="1.5" height="11.8" fill="var(--gold)" /><rect x="40.4" y="12.2" width=".5" height="11.8" fill="#fff" opacity=".35" /><rect x="48" y="12.2" width=".5" height="11.8" fill="#fff" opacity=".35" />
    <path d="M36.4 14.2 H57" stroke="#fff" strokeOpacity=".28" strokeWidth=".9" strokeLinecap="round" />
    <path d="M54.6 12.4 V8.6 H53.2 L52 5.6 H59 L57.8 8.6 H56.4 V12.4 Z" fill="#1c1f27" /><path d="M52 5.6 H59 L58.6 6.6 H52.4 Z" fill="#4a5165" /><rect x="52.8" y="5" width="5.4" height="1.1" rx=".55" fill="#6a7288" />
    <path d="M44 12.4 Q45.2 8.8 46.6 12.4 Z" fill="#c99a3a" /><path d="M44.8 12.4 Q45.4 10 46 12.4 Z" fill="#f0d06b" /><circle cx="49.6" cy="12.2" r="1.1" fill="#d9a843" />
    <rect x="30" y="7.6" width="10.4" height="18.4" rx="1.4" fill="var(--brand)" /><rect x="29" y="6.4" width="12.4" height="2.4" rx="1.1" fill="#1a1d25" /><rect x="29" y="6.4" width="12.4" height=".8" rx=".4" fill="#fff" opacity=".3" />
    <rect x="31.8" y="10.2" width="5.2" height="5.6" rx="1.2" fill="#10131a" /><rect x="32.3" y="10.7" width="4.2" height="4.6" rx=".9" fill="url(#efT-gl)" /><circle cx="34.4" cy="14.2" r="1" fill="#4a3a30" opacity=".85" /><rect x="32.3" y="10.7" width="4.2" height="1.3" fill="#fff" opacity=".4" />
    <rect x="30" y="7.6" width="10.4" height="18.4" rx="1.4" fill="url(#efT-sh)" />
    <rect x="30" y="24.2" width="31" height="2.8" rx="1" fill="#252a35" /><rect x="30" y="24.2" width="31" height=".7" fill="#fff" opacity=".2" />
    <circle cx="59.6" cy="17.4" r="3.6" fill="url(#efT-hl)" /><circle cx="59" cy="17.4" r="1.4" fill="#fff8c4" /><circle cx="59" cy="17.4" r="1.4" fill="none" stroke="#c9a84a" strokeWidth=".4" />
    <rect x="58.2" y="22" width="3.4" height="3.2" rx=".8" fill="#4a5163" /><path d="M60 32.4 L63.9 28.6 V26.2 H60 Z" fill="#3a4050" /><path d="M60.4 30.4 H63.2 M60.4 28.9 H63.4 M60.4 27.4 H63.6" stroke="#9aa3b4" strokeWidth=".5" />
    {/* wheels + side rods */}
    <g className="wheels"><Wheel cx={7.6} cy={29.6} r={3.1} /><Wheel cx={22} cy={29.6} r={3.1} /><Wheel cx={38.4} cy={28.8} r={3.9} spokes={8} /><Wheel cx={48.4} cy={28.8} r={3.9} spokes={8} /><Wheel cx={56.4} cy={29.8} r={2.7} /></g>
    <g className="rod"><line x1="38.4" y1="28.8" x2="48.4" y2="28.8" stroke="#dfe4ec" strokeWidth="1.3" strokeLinecap="round" /><line x1="38.4" y1="28.4" x2="48.4" y2="28.4" stroke="#fff" strokeOpacity=".5" strokeWidth=".4" /></g>
  </svg>;
}

/** Library skin: a wooden book trolley with shelves of books, brass rail, rubber-tyred wheels, pushed along. */
export function BookCart({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  const books: [number, number, string][] = [[0, 7, "#d8453b"], [2.4, 8.4, "#2f6fd0"], [4.8, 6.4, "#e8b631"], [7.2, 8, "#2f9d62"], [9.6, 7, "#8a4fd1"], [12, 8.6, "#e8793a"], [14.4, 6.6, "#d8453b"], [16.8, 7.8, "#2f6fd0"], [19.2, 7, "#e8b631"]];
  const low: [number, number, string][] = [[0, 5.6, "#2f9d62"], [3, 6.4, "#d8453b"], [6, 5, "#2f6fd0"], [9, 6.2, "#e8b631"], [12, 5.4, "#8a4fd1"], [15, 6.2, "#e8793a"], [18, 5.2, "#2f9d62"]];
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    <defs><linearGradient id="efB-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d79a5c" /><stop offset=".5" stopColor="#a8693a" /><stop offset="1" stopColor="#6d4020" /></linearGradient>
      <linearGradient id="efB-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
      <linearGradient id="efB-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></linearGradient></defs>
    <ellipse cx="34" cy="32.8" rx="27" ry="1.3" fill="#000" opacity=".22" />
    {puff && <g className="puffs" fill="var(--gold)"><circle className="puff p1" cx="12" cy="24" r="1.6" /><circle className="puff p2" cx="12" cy="24" r="1.6" /><circle className="puff p3" cx="12" cy="24" r="1.6" /></g>}
    <path d="M13 8.5 H8.4 Q6.6 8.5 6.6 10.3 V26" stroke="#2f333d" strokeWidth="2.1" strokeLinecap="round" fill="none" /><path d="M13 8.5 H8.4 Q6.6 8.5 6.6 10.3 V26" stroke="#c8cfdb" strokeWidth=".8" strokeLinecap="round" fill="none" transform="translate(-.3 -.3)" /><rect x="5.2" y="7.6" width="4.4" height="1.8" rx=".9" fill="#d9a843" />
    <rect x="14" y="4" width="2.4" height="23" rx="1" fill="url(#efB-w)" /><rect x="52" y="4" width="2.4" height="23" rx="1" fill="url(#efB-w)" />
    <rect x="14.2" y="4" width=".7" height="23" fill="#fff" opacity=".25" /><rect x="52.2" y="4" width=".7" height="23" fill="#fff" opacity=".25" />
    <rect x="16.4" y="4.5" width="35.6" height="22" fill="#3b2412" opacity=".55" />
    <g transform="translate(16.4 0)">
      <g>{books.map(([x, h, c], i) => <g key={i} className="bk" style={{ animationDelay: `${i * 0.09}s` }}><rect x={x + 1.4} y={13.6 - h} width="2.2" height={h} rx=".4" fill={c} /><rect x={x + 1.4} y={13.6 - h} width="2.2" height={h} rx=".4" fill="url(#efB-b)" /><rect x={x + 1.4} y={15 - h} width="2.2" height=".7" fill="#fff" opacity=".6" /><rect x={x + 1.4} y={14.6 - h + h * 0.55} width="2.2" height=".5" fill="#fff" opacity=".35" /></g>)}</g>
      <rect x="0" y="13.6" width="36" height="2.4" rx=".8" fill="url(#efB-w)" /><rect x="0" y="13.6" width="36" height=".6" fill="#fff" opacity=".35" />
      <g>{low.map(([x, h, c], i) => <g key={i} className="bk" style={{ animationDelay: `${i * 0.11 + 0.05}s` }}><rect x={x + 1.4} y={22.4 - h} width="2.5" height={h} rx=".4" fill={c} /><rect x={x + 1.4} y={22.4 - h} width="2.5" height={h} fill="url(#efB-b)" /></g>)}<rect x="22.5" y="19.2" width="9" height="3.2" rx=".5" fill="#efe3c6" /><rect x="22.5" y="19.2" width="9" height="1" fill="#fff" opacity=".7" /><rect x="22.5" y="19.2" width="9" height="3.2" rx=".5" fill="none" stroke="#9a7a45" strokeWidth=".4" /><path d="M23.6 20.8 H30.4 M23.6 21.6 H29" stroke="#9a7a45" strokeWidth=".35" /></g>
      <rect x="0" y="22.4" width="36" height="2.8" rx=".8" fill="url(#efB-w)" /><rect x="0" y="22.4" width="36" height="2.8" rx=".8" fill="url(#efB-s)" /><rect x="0" y="22.4" width="36" height=".5" fill="#fff" opacity=".35" /></g>
    <rect x="13.4" y="3" width="41.4" height="2.2" rx="1.1" fill="var(--brand)" /><rect x="13.4" y="3" width="41.4" height=".9" rx=".4" fill="#fff" opacity=".45" /><rect x="13.4" y="4.4" width="41.4" height=".8" fill="#000" opacity=".18" />
    <path d="M29.6 5.2 v4 l1.6 -1.1 l1.6 1.1 v-4" fill="var(--gold)" /><rect x="15.6" y="25.8" width="37" height="1.8" rx=".8" fill="#4a2c14" />
    <g className="wheels"><Wheel cx={20} cy={29.2} r={3.4} /><Wheel cx={48} cy={29.2} r={3.4} /></g><rect x="18.4" y="25.6" width="3.2" height="2.6" rx=".5" fill="#3d4250" /><rect x="46.4" y="25.6" width="3.2" height="2.6" rx=".5" fill="#3d4250" />
  </svg>;
}

/** Ground skin: a sprinter mid-stride - bib number, ponytail, shorts, trainers; limbs swing, body bobs. */
export function Runner({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  const skin = "#e8b48a", skinD = "#c98f66", jersey = "var(--brand)", shorts = "#243158";
  const Leg = ({ cls, rot, back }: { cls: string; rot: number; back?: boolean }) => <g className={`lg ${cls}`} style={{ transformOrigin: "32px 19px", transform: `rotate(${rot}deg)` }}>
    <path d="M32 19 L32 26" stroke={back ? skinD : skin} strokeWidth="3.8" strokeLinecap="round" /><path d="M32 19 L32 23.6" stroke={back ? "#1a2347" : shorts} strokeWidth="5" strokeLinecap="round" />
    <g className={`sh ${cls}s`} style={{ transformOrigin: "32px 26px", transform: "rotate(20deg)" }}><path d="M32 26 L32 31" stroke={back ? skinD : skin} strokeWidth="3.1" strokeLinecap="round" /><rect x="30.6" y="27" width="2.8" height="1.8" rx=".8" fill="#fff" opacity=".9" />
      <path d="M30.8 30.4 H35.8 Q37 30.4 37 31.8 V32.8 H30.4 V31.4 Q30.4 30.4 30.8 30.4 Z" fill={back ? "#dfe3ea" : "#fff"} stroke="#8e98aa" strokeWidth=".4" /><rect x="30.4" y="32.2" width="6.6" height="1.1" rx=".5" fill="var(--brand)" /><path d="M33.2 30.8 L35.2 31.8" stroke="var(--gold)" strokeWidth=".7" /></g></g>;
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    <defs><linearGradient id="efR-j" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".4" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient></defs>
    <ellipse className="rn-sh" cx="33" cy="33.4" rx="13" ry="1.2" fill="#000" opacity=".2" />
    <g stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity=".55" className="spd"><path d="M4 12 H18" /><path d="M0 18 H15" /><path d="M7 24 H18" /><path d="M3 28 H12" /></g>
    {puff && <g className="puffs" fill="#e9dcc3" opacity=".8"><circle className="puff p1" cx="26" cy="31" r="2" /><circle className="puff p2" cx="26" cy="31" r="2" /><circle className="puff p3" cx="26" cy="31" r="2" /></g>}
    <g className="rn-body">
      <Leg cls="lg-b" rot={32} back />
      <g className="ar ar-b" style={{ transformOrigin: "39px 12px", transform: "rotate(35deg)" }}><path d="M39 12 L39 17.4" stroke={skinD} strokeWidth="2.7" strokeLinecap="round" /><g className="fa fa-b" style={{ transformOrigin: "39px 17px", transform: "rotate(-70deg)" }}><path d="M39 17 L39 22" stroke={skinD} strokeWidth="2.5" strokeLinecap="round" /><circle cx="39" cy="22.4" r="1.5" fill={skinD} /></g></g>
      <path className="rn-tail" d="M37.6 4.6 Q33 3.4 31.4 7.4 Q34.4 5.8 37.4 7" fill="#2b1d16" />
      <path d="M33 20 Q35.4 15 39.5 11.2" stroke={jersey} strokeWidth="7.4" strokeLinecap="round" fill="none" /><path d="M33 20 Q35.4 15 39.5 11.2" stroke="url(#efR-j)" strokeWidth="7.4" strokeLinecap="round" fill="none" /><path d="M33 20 Q35.4 15 39.5 11.2" stroke="#fff" strokeOpacity=".25" strokeWidth="1.8" strokeLinecap="round" fill="none" transform="translate(-1.4 -1)" />
      <path d="M30.4 17.6 H36.2 L36.8 21.4 H30 Z" fill={shorts} /><rect x="34.2" y="13.2" width="3.6" height="3.4" rx=".5" fill="#fff" transform="rotate(-32 36 15)" /><text x="36" y="15.7" fontSize="2.6" fontWeight="800" textAnchor="middle" fill="#243158" transform="rotate(-32 36 15)">7</text>
      <Leg cls="lg-f" rot={-38} />
      <rect x="38.2" y="8.2" width="2.4" height="3" rx="1" fill={skin} /><circle cx="41" cy="6.2" r="3.7" fill={skin} /><circle cx="42.4" cy="7.4" r="1.2" fill="#f2a58c" opacity=".35" />
      <path d="M37.3 6 Q37.4 2.2 41.2 2.2 Q44.8 2.4 44.8 5.6 Q41.6 4.2 37.3 6Z" fill="#2b1d16" /><path d="M37.4 6.3 H44.7" stroke="var(--gold)" strokeWidth="1.4" /><circle cx="43.3" cy="6.8" r=".5" fill="#2b1d16" /><path d="M43.7 8.4 Q42.7 8.9 41.8 8.4" stroke="#b9774f" strokeWidth=".5" fill="none" strokeLinecap="round" />
      <g className="ar ar-f" style={{ transformOrigin: "39.6px 12px", transform: "rotate(-40deg)" }}><path d="M39.6 12 L39.6 17.4" stroke={skin} strokeWidth="2.9" strokeLinecap="round" /><path d="M39.6 12 L39.6 14.6" stroke={jersey} strokeWidth="3.9" strokeLinecap="round" /><g className="fa fa-f" style={{ transformOrigin: "39.6px 17px", transform: "rotate(-80deg)" }}><path d="M39.6 17 L39.6 22" stroke={skin} strokeWidth="2.7" strokeLinecap="round" /><circle cx="39.6" cy="22.4" r="1.6" fill={skin} /></g></g>
    </g>
  </svg>;
}

/** The traveller for the current exam skin (train / book cart / runner). */
export function Traveler({ puff = true, className = "", skin }: { puff?: boolean; className?: string; skin?: Skin }) {
  const cur = useSkin(), k = skin ?? cur;
  return k === "library" ? <BookCart puff={puff} className={className} /> : k === "ground" ? <Runner puff={puff} className={className} /> : <Train puff={puff} className={className} />;
}

/** Track from 0 to 100 percent. The train rests at `value`; a flag marks `goal`. Real numbers only. */
export function JourneyStrip({ value, goal, label, arrived }: { value: number; goal?: number | null; label: string; arrived?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value))), g = goal ? Math.max(1, Math.min(100, Math.round(goal))) : null;
  const done = g !== null && v >= g;
  return <figure className={`journey ${done ? "arrived" : ""}`} style={{ "--p": v, "--g": g ?? 100 } as CSSProperties} aria-label={`${label}: ${v}%${g ? `, goal ${g}%` : ""}${done ? ". Goal reached." : ""}`}>
    <div className="journey-track" aria-hidden="true">
      <div className="rail" />
      {[25, 50, 75].map((n) => <i key={n} className="sleeper" style={{ left: `calc(64px + (100% - 64px) * ${n} / 100)` }} />)}
      {g !== null && <span className="station" style={{ left: `calc(64px + (100% - 64px) * ${g} / 100)` }}><i /><b>{g}%</b></span>}
      <div className="journey-train"><Traveler puff={!done} /></div>
    </div>
    <figcaption className="sub">{label}: <b>{v}%</b>{g ? (done ? ` · ${arrived ?? "Goal reached"}` : ` · ${g - v} points to your ${g}% goal`) : ""}</figcaption>
  </figure>;
}

/* ---- loading screen: a tiny world that scrolls past a vehicle that stays in the middle (parallax layers, all periodic every 320 units) ---- */
/** Compact loader: a small vehicle on a thin, clean track. The track scrolls under it; no scenery. */
export function TrainLoader({ text = "Loading" }: { text?: string }) {
  const skin = useSkin(), kind = skin === "library" ? "library" : skin === "ground" ? "ground" : "train";
  return <div className="train-loader" role="status"><div className={`ld-mini ld-${kind}`} aria-hidden="true">
    <div className="ld-trav"><Traveler puff={false} skin={kind} /></div><i className="ld-rail" />
  </div><p className="sub ld-text">{text}</p></div>;
}

export const Rocket = () => <svg className="rocket" width="44" height="56" viewBox="0 0 44 56" aria-hidden="true" focusable="false">
  <path className="rocket-flame" d="M16 40 Q22 56 28 40 Z" fill="var(--gold)" />
  <path d="M22 2 C32 12 34 28 30 42 H14 C10 28 12 12 22 2Z" fill="var(--brand)" /><circle cx="22" cy="20" r="5" fill="var(--brand-soft)" /><rect x="14" y="30" width="16" height="3" fill="var(--gold)" />
  <path d="M14 34 L6 46 L14 42Z M30 34 L38 46 L30 42Z" fill="var(--text)" />
</svg>;

export const PaperPlane = () => <svg className="plane" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path d="M3 18 L37 4 L28 34 L19 23 Z" fill="var(--brand)" /><path d="M19 23 L37 4 L16 26 Z" fill="var(--gold)" /><path className="plane-trail" d="M-20 30 Q0 26 8 24" stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="3 4" fill="none" /></svg>;

/** Onboarding path: where the person is in getting started. */
export function StartPath({ at }: { at: 0 | 1 | 2 }) {
  const steps = ["Account", "Your exam", "First test"];
  return <ol className="start-path" aria-label={`Getting started, step ${at + 1} of 3: ${steps[at]}`}>
    {steps.map((s, i) => <li key={s} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}><i aria-hidden="true">{i < at ? "✓" : i + 1}</i><span>{s}</span>{i === at && <span className="start-train" aria-hidden="true"><Traveler puff={false} /></span>}</li>)}
  </ol>;
}
