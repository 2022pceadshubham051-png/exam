import { useId } from "react";
const INK = "#2b1b55";
const Eyes = ({ y = 48, gap = 13, r = 7.5 }: { y?: number; gap?: number; r?: number }) => <g className="b-eyes">
  <ellipse cx={50 - gap} cy={y} rx={r} ry={r + 1.5} fill="#fff" stroke={INK} strokeWidth="2.6" /><ellipse cx={50 + gap} cy={y} rx={r} ry={r + 1.5} fill="#fff" stroke={INK} strokeWidth="2.6" />
  <g className="m-pupils"><circle cx={50 - gap + 1} cy={y + 1} r="4" fill={INK} /><circle cx={50 + gap + 1} cy={y + 1} r="4" fill={INK} /><circle cx={50 - gap + 2.4} cy={y - .8} r="1.4" fill="#fff" /><circle cx={50 + gap + 2.4} cy={y - .8} r="1.4" fill="#fff" /></g></g>;

/** Professor Hoot: wise owl with glasses. For the Smart Coach. */
export function Owl({ size = 120 }: { size?: number }) {
  const u = useId().replace(/:/g, "");
  return <svg className="buddy buddy-owl" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id={`ow${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb868" /><stop offset="1" stopColor="#ff8a3d" /></linearGradient></defs>
    <ellipse cx="50" cy="95" rx="24" ry="4" fill="rgb(40 30 100 / .25)" />
    <g className="b-body">
      <path d="M22 30 L30 12 L42 24 M78 30 L70 12 L58 24" fill="#ff8a3d" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M50 20 C78 20 88 44 86 66 C84 86 68 93 50 93 C32 93 16 86 14 66 C12 44 22 20 50 20Z" fill={`url(#ow${u})`} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="50" cy="74" rx="19" ry="15" fill="#ffe6bd" stroke={INK} strokeWidth="2.4" />
      <path d="M42 70 q4 4 8 0 M50 76 q4 4 8 0 M38 78 q4 4 8 0" stroke="#f0a35a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Eyes y={46} gap={14} r={9} />
      <path d="M44 56 L50 64 L56 56 Z" fill="#ffd166" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <g className="b-glasses" fill="none" stroke={INK} strokeWidth="3"><circle cx="36" cy="46" r="13" /><circle cx="64" cy="46" r="13" /><path d="M49 46 H51" /></g>
      <path className="b-wing-l" d="M16 58 Q4 70 16 82 Q22 72 20 60Z" fill="#e8742a" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path className="b-wing-r" d="M84 58 Q96 70 84 82 Q78 72 80 60Z" fill="#e8742a" stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M38 93 v4 M46 93 v4 M54 93 v4 M62 93 v4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </g></svg>;
}

/** Cup: a trophy with a face. For the Leaderboard and great results. */
export function TrophyBuddy({ size = 120 }: { size?: number }) {
  const u = useId().replace(/:/g, "");
  return <svg className="buddy buddy-trophy" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id={`tr${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2a0" /><stop offset=".55" stopColor="#ffd23d" /><stop offset="1" stopColor="#f0a30a" /></linearGradient></defs>
    <ellipse cx="50" cy="95" rx="24" ry="4" fill="rgb(40 30 100 / .25)" />
    <g className="b-body">
      <path d="M26 24 Q8 24 10 40 Q12 54 30 56 M74 24 Q92 24 90 40 Q88 54 70 56" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M26 24 Q8 24 10 40 Q12 54 30 56 M74 24 Q92 24 90 40 Q88 54 70 56" fill="none" stroke="#ffd23d" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 16 H76 V40 Q76 64 50 68 Q24 64 24 40Z" fill={`url(#tr${u})`} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M32 24 V40 Q32 52 40 58" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".6" />
      <rect x="44" y="68" width="12" height="10" fill="#f0a30a" stroke={INK} strokeWidth="3" /><path d="M30 78 H70 L74 92 H26Z" fill="#7c5cff" stroke={INK} strokeWidth="3.2" strokeLinejoin="round" /><path d="M50 82 l2 4 4 .6 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.6z" fill="#ffd23d" transform="translate(0 -3) scale(.9) translate(5 0)" />
      <Eyes y={38} gap={11} r={6.5} />
      <path d="M42 50 Q50 58 58 50" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="33" cy="48" rx="4.5" ry="3" fill="#ff8fb8" opacity=".7" /><ellipse cx="67" cy="48" rx="4.5" ry="3" fill="#ff8fb8" opacity=".7" />
    </g>
    <g className="b-twinkle"><path d="M8 10 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" stroke={INK} strokeWidth="1.4" /><path d="M90 8 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffd23d" stroke={INK} strokeWidth="1.2" /></g></svg>;
}

/** Twinkle: a smiling star. */
export function StarBuddy({ size = 60 }: { size?: number }) {
  return <svg className="buddy buddy-star" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"><g className="b-body">
    <path d="M50 8 L62 36 L92 38 L69 58 L77 88 L50 72 L23 88 L31 58 L8 38 L38 36Z" fill="#ffd23d" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <Eyes y={50} gap={10} r={5.5} /><path d="M43 62 Q50 69 57 62" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /><ellipse cx="34" cy="60" rx="4" ry="2.6" fill="#ff8fb8" opacity=".7" /><ellipse cx="66" cy="60" rx="4" ry="2.6" fill="#ff8fb8" opacity=".7" /></g></svg>;
}
