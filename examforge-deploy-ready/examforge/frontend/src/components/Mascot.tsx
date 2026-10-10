import { useId } from "react";
export type Mood = "happy" | "cheer" | "think" | "sad" | "wave";
const INK = "#2b1b55";
/** Forgy, the ExamForge mascot: a bouncy clay blob with a graduation cap, feet and expressive eyebrows. Pure SVG, animated with CSS. */
export default function Mascot({ mood = "happy", size = 120, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const mouth = mood === "sad" ? <path d="M43 80 Q50 72 57 80" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    : mood === "think" ? <path d="M44 77 Q50 79 56 75" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    : mood === "cheer" ? <g><path d="M40 71 Q50 90 60 71 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" /><path d="M44 80 Q50 76 56 80 Q50 87 44 80Z" fill="#ff7a9c" /></g>
    : <path d="M42 72 Q50 83 58 72" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />;
  const uid = useId().replace(/:/g, ""); const arms = mood === "cheer" || mood === "wave";
  const brows = mood === "sad" ? "M29 44 L45 48 M71 44 L55 48" : mood === "think" ? "M29 47 L45 43 M55 49 L71 49" : mood === "cheer" ? "M30 42 Q38 36 46 42 M54 42 Q62 36 70 42" : "M31 46 Q38 42 45 46 M55 46 Q62 42 69 46";
  return <svg className={`mascot mascot-${mood} ${className}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Forgy the ExamForge mascot">
    <defs>
      <radialGradient id={`mb${uid}`} cx="34%" cy="26%" r="85%"><stop offset="0" stopColor="#c9c0ff" /><stop offset=".5" stopColor="#8b7bff" /><stop offset="1" stopColor="#5f4de0" /></radialGradient>
      <linearGradient id={`mcap${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7aa6" /><stop offset="1" stopColor="#ff4f86" /></linearGradient>
    </defs>
    <ellipse className="m-shadow" cx="50" cy="95" rx="27" ry="4.2" fill="rgb(40 30 100 / .28)" />
    <g className="m-body">
      <g className="m-feet"><ellipse cx="36" cy="91" rx="10" ry="5.5" fill="#6d5af0" stroke={INK} strokeWidth="3" /><ellipse cx="64" cy="91" rx="10" ry="5.5" fill="#6d5af0" stroke={INK} strokeWidth="3" /></g>
      <g className="m-arm-l" style={{ transformOrigin: "20px 62px" }}><ellipse cx={arms ? 13 : 16} cy={arms ? 50 : 68} rx="7" ry="10" fill="#8b7bff" stroke={INK} strokeWidth="3" transform={arms ? "rotate(-25 13 50)" : "rotate(20 16 68)"} /></g>
      <g className="m-arm-r" style={{ transformOrigin: "80px 62px" }}><ellipse cx={arms ? 87 : 84} cy={arms ? 50 : 68} rx="7" ry="10" fill="#8b7bff" stroke={INK} strokeWidth="3" transform={arms ? "rotate(25 87 50)" : "rotate(-20 84 68)"} /></g>
      <path d="M50 22 C78 22 91 44 91 64 C91 84 73 93 50 93 C27 93 9 84 9 64 C9 44 22 22 50 22 Z" fill={`url(#mb${uid})`} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="80" rx="22" ry="9" fill="#fff" opacity=".13" />
      <ellipse cx="33" cy="40" rx="9" ry="4.6" fill="#fff" opacity=".42" transform="rotate(-28 33 40)" />
      <circle cx="24" cy="52" r="2" fill="#fff" opacity=".5" />
      <g className="m-eyes"><ellipse cx="38" cy="58" rx="8.2" ry="9.8" fill="#fff" stroke={INK} strokeWidth="2.6" /><ellipse cx="62" cy="58" rx="8.2" ry="9.8" fill="#fff" stroke={INK} strokeWidth="2.6" />
        <g className="m-pupils"><circle cx="39" cy="59" r="4.8" fill={INK} /><circle cx="63" cy="59" r="4.8" fill={INK} /><circle cx="40.8" cy="56.8" r="1.7" fill="#fff" /><circle cx="64.8" cy="56.8" r="1.7" fill="#fff" /></g></g>
      <path className="m-brows" d={brows} stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="72" rx="6" ry="4" fill="#ff8fb8" opacity=".7" /><ellipse cx="74" cy="72" rx="6" ry="4" fill="#ff8fb8" opacity=".7" />
      {mouth}
      <g className="m-cap"><path d="M19 28 L50 14 L81 28 L50 42 Z" fill={`url(#mcap${uid})`} stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M34 36 V45 Q50 54 66 45 V36 L50 42 Z" fill="#e23e78" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <g className="m-tassel" style={{ transformOrigin: "79px 29px" }}><path d="M79 29 V44" stroke="#ffd166" strokeWidth="2.6" strokeLinecap="round" /><circle cx="79" cy="46.5" r="3.4" fill="#ffd166" stroke={INK} strokeWidth="2" /></g></g>
    </g>
    {mood === "sad" && <path className="m-tear" d="M31 70 q-3.5 6 0 8.5 q3.5 -2.5 0 -8.5z" fill="#7dd3fc" stroke={INK} strokeWidth="1.2" />}
    {mood === "cheer" && <g className="m-sparks"><path d="M10 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffd166" /><path d="M90 16 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffd166" /></g>}
  </svg>;
}
