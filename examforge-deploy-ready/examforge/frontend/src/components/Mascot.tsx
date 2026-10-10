export type Mood = "happy" | "cheer" | "think" | "sad" | "wave";
/** Forgy, the ExamForge mascot. A friendly clay blob with a graduation cap. Pure SVG, animated with CSS. */
export default function Mascot({ mood = "happy", size = 120, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const mouth = mood === "sad" ? <path d="M44 78 Q50 72 56 78" stroke="#4a2f7a" strokeWidth="3" fill="none" strokeLinecap="round" />
    : mood === "think" ? <path d="M45 76 H55" stroke="#4a2f7a" strokeWidth="3" strokeLinecap="round" />
    : mood === "cheer" ? <path d="M42 72 Q50 88 58 72 Z" fill="#4a2f7a" /> : <path d="M43 73 Q50 82 57 73" stroke="#4a2f7a" strokeWidth="3" fill="none" strokeLinecap="round" />;
  const arms = mood === "cheer" || mood === "wave";
  return <svg className={`mascot mascot-${mood} ${className}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Forgy the ExamForge mascot">
    <defs><radialGradient id="mb" cx="35%" cy="28%" r="80%"><stop offset="0" stopColor="#b9aeff" /><stop offset="0.6" stopColor="#8b7bff" /><stop offset="1" stopColor="#6c5ce7" /></radialGradient></defs>
    <ellipse className="m-shadow" cx="50" cy="94" rx="26" ry="4" fill="rgb(70 60 140 / .25)" />
    <g className="m-body">
      <g className="m-arm-l" style={{ transformOrigin: "20px 62px" }}><ellipse cx={arms ? 14 : 17} cy={arms ? 50 : 68} rx="7" ry="10" fill="#8b7bff" stroke="#2b1b55" strokeWidth="3" transform={arms ? "rotate(-25 14 50)" : "rotate(20 17 68)"} /></g>
      <g className="m-arm-r" style={{ transformOrigin: "80px 62px" }}><ellipse cx={arms ? 86 : 83} cy={arms ? 50 : 68} rx="7" ry="10" fill="#8b7bff" stroke="#2b1b55" strokeWidth="3" transform={arms ? "rotate(25 86 50)" : "rotate(-20 83 68)"} /></g>
      <path d="M50 22 C78 22 90 44 90 64 C90 84 72 92 50 92 C28 92 10 84 10 64 C10 44 22 22 50 22 Z" fill="url(#mb)" stroke="#2b1b55" strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="34" cy="40" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-25 34 40)" />
      <g className="m-eyes"><ellipse cx="38" cy="58" rx="8" ry="9.5" fill="#fff" stroke="#2b1b55" strokeWidth="2.5" /><ellipse cx="62" cy="58" rx="8" ry="9.5" fill="#fff" stroke="#2b1b55" strokeWidth="2.5" />
        <g className="m-pupils"><circle cx="39" cy="58" r="4.5" fill="#2b1b55" /><circle cx="63" cy="58" r="4.5" fill="#2b1b55" /><circle cx="40.5" cy="56.5" r="1.4" fill="#fff" /><circle cx="64.5" cy="56.5" r="1.4" fill="#fff" /></g></g>
      {mood === "think" && <path d="M30 46 L44 49 M70 46 L56 49" stroke="#4a2f7a" strokeWidth="2.5" strokeLinecap="round" />}
      <ellipse cx="27" cy="72" rx="6" ry="4" fill="#ff8fb8" opacity=".6" /><ellipse cx="73" cy="72" rx="6" ry="4" fill="#ff8fb8" opacity=".6" />
      {mouth}
      <g className="m-cap"><path d="M20 28 L50 15 L80 28 L50 41 Z" fill="#ff5d8f" stroke="#2b1b55" strokeWidth="3" strokeLinejoin="round" /><path d="M34 35 V45 Q50 53 66 45 V35 L50 41 Z" fill="#3d3080" /><path d="M78 29 V44" stroke="#ffd166" strokeWidth="2.5" strokeLinecap="round" /><circle cx="78" cy="46" r="3.2" fill="#ffd166" /></g>
    </g>
    {mood === "sad" && <path className="m-tear" d="M31 70 q-3 6 0 8 q3 -2 0 -8z" fill="#7dd3fc" />}
  </svg>;
}
