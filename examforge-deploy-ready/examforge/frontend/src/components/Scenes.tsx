import { useId } from "react";

/**
 * Animated illustrations: classroom (teacher + students), library (student reading) and railway (train).
 * Pure inline SVG + CSS animation (see scenes.css), so they work offline, scale crisply and cost no network.
 */

/** The teacher. `cheer` raises an arm with a star (celebrations); otherwise she points at the board. */
export function TeacherFigure({ cheer = false }: { cheer?: boolean }) {
  return <g className="sc-teacher">
    <ellipse cx="30" cy="150" rx="22" ry="3.5" fill="#000" opacity=".12" />
    {/* legs + shoes */}
    <rect x="18" y="112" width="10" height="36" rx="4" fill="#27315a" /><rect x="32" y="112" width="10" height="36" rx="4" fill="#27315a" />
    <rect x="15" y="145" width="15" height="6" rx="3" fill="#161b33" /><rect x="30" y="145" width="15" height="6" rx="3" fill="#161b33" />
    {/* hanging arm */}
    <rect x="9" y="38" width="8" height="42" rx="4" fill="#4f5fe8" /><circle cx="13" cy="82" r="4.5" fill="#f2c29b" />
    {/* body */}
    <path d="M12 34 Q30 28 48 34 L52 116 L8 116 Z" fill="#5b6cff" />
    <path d="M24 33 L30 52 L36 33 Z" fill="#fff" />
    <rect x="9" y="104" width="42" height="14" rx="3" fill="#27315a" />
    {/* neck + head */}
    <rect x="26" y="24" width="8" height="10" fill="#e8b48a" />
    <circle cx="30" cy="10" r="14" fill="#3a2a22" /><circle cx="30" cy="-3" r="6" fill="#3a2a22" />
    <circle cx="30" cy="16" r="11.5" fill="#f2c29b" />
    <path d="M18.5 12 Q30 -2 41.5 12 Q36 6 30 6 Q24 6 18.5 12Z" fill="#3a2a22" />
    <g className="sc-blink"><circle cx="26" cy="16" r="3.4" fill="none" stroke="#27315a" strokeWidth="1.3" /><circle cx="34.5" cy="16" r="3.4" fill="none" stroke="#27315a" strokeWidth="1.3" /><path d="M29.4 16 H31.1" stroke="#27315a" strokeWidth="1.3" />
      <circle cx="26" cy="16" r="1.1" fill="#27315a" /><circle cx="34.5" cy="16" r="1.1" fill="#27315a" /></g>
    <path d="M26 22.5 Q30.2 26.5 34.4 22.5" stroke="#b5533c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {cheer ? <g className="sc-cheer-arm">
      <path d="M46 38 L62 10" stroke="#4f5fe8" strokeWidth="9" strokeLinecap="round" /><circle cx="63" cy="7" r="4.6" fill="#f2c29b" />
      <path className="sc-star" d="M64 -22 l3.2 6.8 7.4 1 -5.4 5.2 1.3 7.4 -6.5 -3.6 -6.5 3.6 1.3 -7.4 -5.4 -5.2 7.4 -1z" fill="#ffc83d" stroke="#e69a00" strokeWidth="1" />
    </g> : <g className="sc-point-arm">
      <path d="M46 38 L72 56" stroke="#4f5fe8" strokeWidth="9" strokeLinecap="round" /><circle cx="74" cy="57.5" r="4.6" fill="#f2c29b" />
      <path d="M72 56 L132 22" stroke="#c58a3e" strokeWidth="2.6" strokeLinecap="round" />
    </g>}
  </g>;
}

/** Standalone teacher for dialogs, result and level-up. */
export function TeacherAvatar({ size = 140, cheer = false, className = "" }: { size?: number; cheer?: boolean; className?: string }) {
  return <svg className={`sc sc-avatar ${className}`} width={size} height={size * 1.2} viewBox={cheer ? "-14 -34 130 200" : "-14 -14 150 180"} role="img" aria-label="Teacher">
    <TeacherFigure cheer={cheer} />
  </svg>;
}

const STUDENTS = [{ x: 150, d: 0 }, { x: 212, d: 0.7, hand: true }, { x: 274, d: 1.4 }];

/** Classroom: teacher explaining on the blackboard, students listening, one raises a hand. */
export function TeacherScene({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`sc ${className}`} viewBox="0 0 320 200" role="img" aria-label="A teacher explains on the blackboard while students listen" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`w${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6eeff" /><stop offset="1" stopColor="#cfdcff" /></linearGradient></defs>
    <rect width="320" height="200" fill={`url(#w${id})`} /><rect y="172" width="320" height="28" fill="#c9a77c" /><rect y="170" width="320" height="3" fill="#a98458" />
    {/* clock */}
    <g transform="translate(78 30)"><circle r="14" fill="#fff" stroke="#8b5a2b" strokeWidth="3" /><path d="M0 0 V-8" stroke="#27315a" strokeWidth="2" strokeLinecap="round" />
      <path className="sc-tick" d="M0 0 V-10" stroke="#e0483f" strokeWidth="1.2" strokeLinecap="round" /></g>
    {/* board */}
    <rect x="124" y="22" width="184" height="100" rx="6" fill="#2f6b55" stroke="#8b5a2b" strokeWidth="5" />
    <text x="138" y="46" fill="#f4f1e8" fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">Today: Practice Test</text>
    <path className="sc-chalk c1" d="M138 60 H262" /><path className="sc-chalk c2" d="M138 76 H236" /><path className="sc-chalk c3" d="M138 92 H282" />
    <path className="sc-chalk c4" d="M270 104 l6 6 l12 -14" stroke="#ffe27a" />
    <rect x="130" y="118" width="172" height="4" fill="#8b5a2b" />
    <g transform="translate(22 20)"><TeacherFigure /></g>
    {/* students (seen from behind) */}
    {STUDENTS.map((s, i) => <g key={i} className={`sc-student${s.hand ? " raise" : ""}`} style={{ animationDelay: `${s.d}s` }}>
      <rect x={s.x - 24} y="168" width="48" height="6" rx="2" fill="#8b5a2b" /><rect x={s.x - 20} y="174" width="4" height="22" fill="#6f4520" /><rect x={s.x + 16} y="174" width="4" height="22" fill="#6f4520" />
      <path d={`M${s.x - 14} 168 Q${s.x - 14} 150 ${s.x} 148 Q${s.x + 14} 150 ${s.x + 14} 168 Z`} fill={["#ff8a5b", "#35b6a0", "#a06cf2"][i]} />
      <circle cx={s.x} cy="140" r="9" fill="#2b2118" />
      {s.hand && <g className="sc-hand"><rect x={s.x + 10} y="132" width="5" height="22" rx="2.5" fill={["#ff8a5b", "#35b6a0", "#a06cf2"][i]} transform={`rotate(-12 ${s.x + 12} 154)`} /><circle cx={s.x + 8} cy="130" r="3.6" fill="#f2c29b" /></g>}
    </g>)}
  </svg>;
}

const SHELF = ["#e0483f", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef6aa0", "#0ea5e9", "#84cc16"];
function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  const books: JSX.Element[] = []; let cx = x + 4, n = 0;
  while (cx < x + w - 8) { const bw = 5 + ((n * 7) % 5), bh = 20 + ((n * 11) % 12); books.push(<rect key={n} x={cx} y={y - bh} width={bw} height={bh} rx="1" fill={SHELF[(n + Math.floor(x / 9)) % SHELF.length]} />); cx += bw + 1; n++; }
  return <g>{books}<rect x={x} y={y} width={w} height="4" fill="#6f4520" /></g>;
}

/** Library: shelves of books, a student reading under a lamp, pages turning, dust floating. */
export function LibraryScene({ className = "" }: { className?: string }) {
  return <svg className={`sc ${className}`} viewBox="0 0 320 200" role="img" aria-label="A student reads a book in a quiet library" preserveAspectRatio="xMidYMid slice">
    <rect width="320" height="200" fill="#f3e2c7" /><rect y="176" width="320" height="24" fill="#b98a55" />
    {/* bookcases */}
    <rect x="6" y="14" width="104" height="164" fill="#8b5a2b" /><rect x="10" y="18" width="96" height="156" fill="#5e3b19" />
    {[48, 86, 124, 162].map((y) => <Shelf key={"l" + y} x={10} y={y} w={96} />)}
    <rect x="210" y="14" width="104" height="164" fill="#8b5a2b" /><rect x="214" y="18" width="96" height="156" fill="#5e3b19" />
    {[48, 86, 124, 162].map((y) => <Shelf key={"r" + y} x={214} y={y} w={96} />)}
    {/* ladder */}
    <path d="M112 30 L122 176 M130 30 L138 176" stroke="#a9713a" strokeWidth="3.5" />{[56, 86, 116, 146].map((y) => <path key={y} d={`M${113 + (y - 30) * 0.07} ${y} H${131 + (y - 30) * 0.055}`} stroke="#a9713a" strokeWidth="3" />)}
    {/* floating books */}
    <g className="sc-float f1"><rect x="150" y="40" width="22" height="16" rx="2" fill="#3b82f6" /><rect x="152" y="43" width="18" height="2" fill="#fff" opacity=".7" /></g>
    <g className="sc-float f2"><rect x="178" y="26" width="18" height="13" rx="2" fill="#ef6aa0" /><rect x="180" y="29" width="14" height="2" fill="#fff" opacity=".7" /></g>
    {/* lamp */}
    <circle className="sc-glow" cx="174" cy="122" r="34" fill="#ffd36b" opacity=".35" />
    <path d="M174 128 V150" stroke="#444" strokeWidth="3" /><path d="M162 128 L168 112 H180 L186 128 Z" fill="#f59e0b" />
    {/* table */}
    <rect x="96" y="150" width="130" height="8" rx="2" fill="#7a4a1d" /><rect x="104" y="158" width="6" height="22" fill="#5e3b19" /><rect x="212" y="158" width="6" height="22" fill="#5e3b19" />
    {/* student (side view) */}
    <g className="sc-reader">
      <rect x="118" y="140" width="34" height="10" rx="3" fill="#2d3a66" />
      <path d="M126 140 Q124 112 138 106 L150 110 Q154 126 150 140 Z" fill="#ff8a5b" />
      <circle cx="141" cy="94" r="11.5" fill="#f2c29b" /><path d="M129 93 Q131 80 143 81 Q152 82 152 92 Q146 86 138 88 Q133 89 129 93Z" fill="#2b2118" />
      <path d="M144 103 L158 138" stroke="#e5703f" strokeWidth="8" strokeLinecap="round" />
    </g>
    {/* open book + turning page */}
    <g><path d="M154 150 L184 150 L184 138 Q168 134 154 140 Z" fill="#fff" stroke="#ddd" /><path d="M184 150 L212 150 L212 140 Q198 134 184 138 Z" fill="#f7f7f2" stroke="#ddd" />
      <g className="sc-page"><path d="M184 150 L212 150 L212 140 Q198 134 184 138 Z" fill="#fffef6" stroke="#ccc" /></g></g>
    {[0, 1, 2, 3, 4].map((i) => <circle key={i} className={`sc-dust d${i}`} cx={30 + i * 62} cy="170" r="1.6" fill="#fff" />)}
  </svg>;
}

/** One carriage (width 78). */
const Coach = ({ x, color = "#1f6fd8" }: { x: number; color?: string }) => <g transform={`translate(${x} 0)`}>
  <rect x="0" y="116" width="76" height="34" rx="4" fill={color} /><rect x="0" y="134" width="76" height="4" fill="#fff" opacity=".85" /><rect x="0" y="140" width="76" height="2" fill="#ffc83d" />
  {[7, 22, 37, 52].map((wx) => <rect key={wx} x={wx} y="122" width="11" height="9" rx="2" fill="#cfeaff" />)}
  <rect x="-3" y="146" width="82" height="4" fill="#333" />
  {[14, 56].map((wx) => <g key={wx} className="sc-wheel" style={{ transformOrigin: `${wx}px 154px` }}><circle cx={wx} cy="154" r="6" fill="#222" /><path d={`M${wx - 5} 154 H${wx + 5} M${wx} 149 V159`} stroke="#bbb" strokeWidth="1.3" /></g>)}
</g>;

/** Railway: a train moving past scrolling hills, trees, poles and sleepers. `compact` crops to just the track (loaders). */
export function TrainScene({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`sc sc-train ${className}`} viewBox={compact ? "10 88 300 112" : "0 0 320 200"} role="img" aria-label="A train runs along the railway track" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0ff" /><stop offset="1" stopColor="#e6f6ff" /></linearGradient></defs>
    {!compact && <><rect width="320" height="200" fill={`url(#s${id})`} /><circle cx="262" cy="34" r="16" fill="#ffd36b" />
      <g className="sc-cloud cl1"><ellipse cx="60" cy="38" rx="22" ry="8" fill="#fff" /><ellipse cx="74" cy="32" rx="14" ry="8" fill="#fff" /></g>
      <g className="sc-cloud cl2"><ellipse cx="190" cy="56" rx="18" ry="6" fill="#fff" /><ellipse cx="200" cy="51" rx="11" ry="6" fill="#fff" /></g>
      <g className="sc-scroll slow"><path d="M0 120 Q40 70 80 110 T160 100 T240 112 T320 98 V150 H0Z M320 120 Q360 70 400 110 T480 100 T560 112 T640 98 V150 H320Z" fill="#9ccf9a" /></g>
      <g className="sc-scroll mid">{[10, 70, 130, 200, 260, 330, 390, 450, 520, 580].map((tx, i) => <g key={i}><rect x={tx + 5} y="126" width="4" height="14" fill="#6f4520" /><path d={`M${tx} 130 L${tx + 7} 104 L${tx + 14} 130Z`} fill="#3f9d57" /></g>)}</g></>}
    <rect y="140" width="320" height="70" fill={compact ? "transparent" : "#7ab86a"} />
    {/* poles */}
    <g className="sc-scroll pole">{[20, 100, 180, 260, 340, 420].map((px) => <g key={px}><rect x={px} y="96" width="3" height="48" fill="#555" /><rect x={px - 7} y="100" width="17" height="2.5" fill="#555" /></g>)}<path d="M13 101 H423" stroke="#555" strokeWidth="1" /></g>
    {/* track */}
    <rect y="156" width="320" height="8" fill="#8f8f8f" /><g className="sc-scroll sleepers">{Array.from({ length: 18 }, (_, i) => <rect key={i} x={i * 22} y="157" width="9" height="7" fill="#5a3a1c" />)}</g>
    <rect y="154" width="320" height="2.4" fill="#d8d8d8" /><rect y="164" width="320" height="2.4" fill="#d8d8d8" />
    {/* smoke */}
    <g>{[0, 1, 2].map((i) => <circle key={i} className={`sc-smoke s${i}`} cx="262" cy="100" r="7" fill="#fff" opacity=".8" />)}</g>
    {/* train, bobbing slightly */}
    <g className="sc-trainbody" transform="translate(0 0)">
      <Coach x={20} /><Coach x={100} />
      <g transform="translate(180 0)">
        <rect x="0" y="108" width="84" height="42" rx="6" fill="#f2f6ff" /><rect x="0" y="108" width="84" height="12" rx="6" fill="#1f4fd8" /><rect x="0" y="130" width="84" height="6" fill="#ffc83d" />
        <path d="M60 108 H80 Q86 108 86 116 V150 H60 Z" fill="#1f4fd8" /><rect x="66" y="114" width="14" height="12" rx="2" fill="#cfeaff" /><circle className="sc-lamp" cx="84" cy="138" r="3.5" fill="#fff8b0" />
        <rect x="8" y="114" width="14" height="12" rx="2" fill="#cfeaff" /><rect x="28" y="114" width="14" height="12" rx="2" fill="#cfeaff" />
        <path d="M30 108 L40 96 H62 L68 108" stroke="#444" strokeWidth="2" fill="none" /><path d="M36 96 H66" stroke="#444" strokeWidth="2.4" />
        <rect x="-3" y="146" width="90" height="4" fill="#333" />
        {[14, 42, 70].map((wx) => <g key={wx} className="sc-wheel" style={{ transformOrigin: `${wx}px 154px` }}><circle cx={wx} cy="154" r="6.5" fill="#222" /><path d={`M${wx - 5} 154 H${wx + 5} M${wx} 149 V159`} stroke="#bbb" strokeWidth="1.3" /></g>)}
      </g>
      <path d="M96 138 H100 M176 138 H180" stroke="#333" strokeWidth="3" />
    </g>
  </svg>;
}

/** Thin strip with a train crossing the screen. Used above the footer on every page. */
export function TrainStrip() {
  return <div className="train-strip" aria-hidden="true">
    <div className="train-run"><svg width="190" height="40" viewBox="14 100 258 66"><g>
      <Coach x={20} /><Coach x={100} />
      <g transform="translate(180 0)"><rect x="0" y="108" width="84" height="42" rx="6" fill="#f2f6ff" /><rect x="0" y="108" width="84" height="12" rx="6" fill="#1f4fd8" /><rect x="0" y="130" width="84" height="6" fill="#ffc83d" />
        <path d="M60 108 H80 Q86 108 86 116 V150 H60 Z" fill="#1f4fd8" /><rect x="66" y="114" width="14" height="12" rx="2" fill="#cfeaff" /><rect x="8" y="114" width="14" height="12" rx="2" fill="#cfeaff" /><rect x="28" y="114" width="14" height="12" rx="2" fill="#cfeaff" />
        {[14, 42, 70].map((wx) => <g key={wx} className="sc-wheel" style={{ transformOrigin: `${wx}px 154px` }}><circle cx={wx} cy="154" r="6.5" fill="#222" /><path d={`M${wx - 5} 154 H${wx + 5}`} stroke="#bbb" strokeWidth="1.3" /></g>)}</g>
    </g></svg></div>
    <div className="train-rail" />
  </div>;
}
