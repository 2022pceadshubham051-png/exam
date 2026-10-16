import { useId } from "react";
/** ExamForge logo: an anvil with a golden spark on a gradient badge. */
export default function LogoMark({ size = 34, animate = true, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  const u = useId().replace(/:/g, "");
  return <svg className={`logo-mark ${animate ? "logo-live" : ""} ${className}`} width={size} height={size} viewBox="0 0 128 128" role="img" aria-label="ExamForge logo">
    <defs>
      <linearGradient id={`lm-bg${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6f5bff" /><stop offset=".55" stopColor="#3f7dff" /><stop offset="1" stopColor="#16c9d8" /></linearGradient>
      <linearGradient id={`lm-an${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cfe0ff" /></linearGradient>
      <linearGradient id={`lm-sp${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff2a8" /><stop offset="1" stopColor="#ffb62e" /></linearGradient>
      <clipPath id={`lm-cp${u}`}><rect x="4" y="4" width="120" height="120" rx="34" /></clipPath>
    </defs>
    <rect x="4" y="4" width="120" height="120" rx="34" fill={`url(#lm-bg${u})`} />
    <ellipse cx="64" cy="-6" rx="84" ry="52" fill="#fff" opacity=".16" clipPath={`url(#lm-cp${u})`} />
    <g className="lm-anvil">
      <path d="M14 66 Q30 62 48 61 H102 Q110 61 110 67 V71 Q110 76 104 76 H88 Q85 85 91 93 H99 V104 H30 V93 H38 Q44 85 41 76 H38 Q20 74 14 66Z" fill={`url(#lm-an${u})`} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 64 H100 Q105 64 105 67 H62Z" fill="#9bb8ff" opacity=".5" />
    </g>
    <g transform="translate(66 34)"><g className="lm-spark"><path d="M0 -22 Q3 -3 22 0 Q3 3 0 22 Q-3 3 -22 0 Q-3 -3 0 -22Z" fill={`url(#lm-sp${u})`} stroke="#fff" strokeWidth="3" strokeLinejoin="round" /></g></g>
    <circle className="lm-dot d1" cx="96" cy="26" r="5" fill="#ffe27a" stroke="#fff" strokeWidth="2.5" />
    <circle className="lm-dot d2" cx="42" cy="38" r="3.5" fill="#fff" opacity=".9" />
    <circle className="lm-dot d3" cx="106" cy="46" r="2.8" fill="#fff" opacity=".8" />
  </svg>;
}
