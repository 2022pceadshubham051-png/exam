import { useEffect, useState } from "react";
import { BookOpen, Pencil, GraduationCap, Lightbulb, Atom, Calculator, Ruler, FlaskConical, Clock, Award, NotebookPen, Sigma, Brain, Library, Globe2, Microscope } from "lucide-react";

/**
 * Study-themed motion: ambient doodle backdrop, scroll reveal, typewriter, OMR sheet, stopwatch, book stack,
 * book loader and cap toss. Pure SVG/CSS (see studyfx.css), no network, and all of it stops for reduced-motion users.
 */

const ICONS = [BookOpen, Pencil, GraduationCap, Lightbulb, Atom, Calculator, Ruler, FlaskConical, Clock, Award, NotebookPen, Sigma, Brain, Library, Globe2, Microscope];
const GLYPHS = ["π", "∑", "E=mc²", "A+", "√x", "H₂O", "✓", "%", "x²+y²", "∫"];
// Deterministic "random" so the layout is stable between renders (no hydration or flicker issues).
const SPOTS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 7) % 96, top: (i * 53 + 11) % 92, size: 22 + ((i * 13) % 22), dur: 14 + ((i * 7) % 12), delay: -((i * 3) % 14), glyph: i % 3 === 2,
}));

/** Fixed, faint, non-interactive layer of floating study icons behind every page. */
export function StudyBackdrop() {
  return <div className="fx-backdrop" aria-hidden="true">
    {SPOTS.map((s, i) => {
      const I = ICONS[i % ICONS.length];
      return <span key={i} className={`fx-doodle k${i % 4}`} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s`, fontSize: s.size }}>
        {s.glyph ? <b>{GLYPHS[i % GLYPHS.length]}</b> : <I size={s.size} strokeWidth={1.6} />}
      </span>;
    })}
  </div>;
}

/** Fades/slides cards and sections in as they scroll into view. Skipped on the live exam screen so nothing flickers mid-test. */
export function useScrollReveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const SEL = ".card, .scene-band, .grid-auto > *, .pub-hero > *, .hero, .tcard, .fx-tile";
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("rv-in"); io.unobserve(e.target); } }), { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    const seen = new WeakSet<Element>(); let n = 0;
    const scan = () => {
      if (location.pathname.startsWith("/exam/")) return;
      document.querySelectorAll(SEL).forEach((el) => {
        if (seen.has(el) || el.closest(".splash, .levelup, .tutorial, .tu-top, .fx-backdrop")) return;
        seen.add(el); el.classList.add("rv"); (el as HTMLElement).style.setProperty("--rv-d", `${(n++ % 6) * 70}ms`); io.observe(el);
      });
    };
    scan(); let t = 0; const mo = new MutationObserver(() => { clearTimeout(t); t = window.setTimeout(() => { n = 0; scan(); }, 60); });
    mo.observe(document.getElementById("root")!, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t); };
  }, []);
}

/** Mounted once in main.tsx. Keeps scroll-reveal behavior without mounting decorative icons behind every page. */
export default function StudyFx() { useScrollReveal(); return null; }

/** Types and deletes a rotating list of exam names. */
export function Typewriter({ words, className = "" }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0), [n, setN] = useState(0), [del, setDel] = useState(false);
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (still) return; const w = words[i];
    const t = setTimeout(() => {
      if (!del && n < w.length) setN(n + 1);
      else if (!del) setDel(true);
      else if (n > 0) setN(n - 1);
      else { setDel(false); setI((i + 1) % words.length); }
    }, !del && n === w.length ? 1300 : del ? 40 : 85);
    return () => clearTimeout(t);
  }, [n, del, i, words, still]);
  return <span className={`fx-type ${className}`}>{still ? words[0] : words[i].slice(0, n)}<i className="fx-caret" /></span>;
}

/** OMR answer sheet: bubbles fill one by one, then a green tick stamps the sheet. */
export function OmrSheet() {
  const pick = [1, 3, 0, 2, 1];
  return <svg className="fx-svg" viewBox="0 0 200 150" role="img" aria-label="An OMR sheet being filled in">
    <rect x="14" y="8" width="172" height="134" rx="10" fill="#fff" stroke="#cfd6ea" strokeWidth="2" />
    <rect x="14" y="8" width="172" height="22" rx="10" fill="#4f46e5" /><rect x="14" y="20" width="172" height="10" fill="#4f46e5" />
    <text x="100" y="23" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">ANSWER SHEET</text>
    {pick.map((p, r) => <g key={r}>
      <text x="26" y={53 + r * 20} fontSize="10" fontWeight="700" fill="#64748b" fontFamily="system-ui, sans-serif">{r + 1}</text>
      {["A", "B", "C", "D"].map((l, c) => <g key={l}>
        <circle cx={50 + c * 28} cy={50 + r * 20} r="7.5" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
        <text x={50 + c * 28} y={53.2 + r * 20} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="system-ui, sans-serif">{l}</text>
        {c === p && <circle className="fx-bubble" cx={50 + c * 28} cy={50 + r * 20} r="7.5" fill="#1e293b" style={{ animationDelay: `${r * 0.9}s` }} />}
      </g>)}
    </g>)}
    <g className="fx-stamp"><circle cx="160" cy="118" r="17" fill="#16a34a" opacity=".95" /><path d="M151 118 l6 6 12 -13" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
    <g className="fx-pencil"><path d="M0 0 L16 -6 L18 -2 L4 6 Z" fill="#f59e0b" /><path d="M0 0 L4 6 L-3 5 Z" fill="#f2c29b" /><path d="M-1 4.6 L-3 5 L-1.5 3.4Z" fill="#334155" /><rect x="14.5" y="-6.5" width="5" height="9.5" fill="#ef6aa0" transform="rotate(-24 14.5 -6.5)" /></g>
  </svg>;
}

/** Stopwatch with a sweeping hand and a ticking colour ring. */
export function Stopwatch() {
  return <svg className="fx-svg" viewBox="0 0 200 150" role="img" aria-label="A stopwatch counting down">
    <rect x="90" y="10" width="20" height="9" rx="3" fill="#475569" /><rect x="96" y="17" width="8" height="8" fill="#64748b" />
    <g className="fx-wob"><circle cx="100" cy="82" r="56" fill="#fff" stroke="#4f46e5" strokeWidth="7" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="M100 33 V40" stroke="#94a3b8" strokeWidth={i % 3 === 0 ? 3 : 1.6} strokeLinecap="round" transform={`rotate(${i * 30} 100 82)`} />)}
      <circle className="fx-ring" cx="100" cy="82" r="43" fill="none" stroke="#f59e0b" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 100 82)" />
      <g className="fx-hand"><path d="M100 82 V44" stroke="#e0483f" strokeWidth="3" strokeLinecap="round" /></g><circle cx="100" cy="82" r="5" fill="#1e293b" /></g>
  </svg>;
}

const SPINE = ["#e0483f", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6"];
/** Books dropping onto a stack, then a graduation cap lands on top. */
export function BookStack() {
  return <svg className="fx-svg" viewBox="0 0 200 150" role="img" aria-label="A stack of books topped with a graduation cap">
    <ellipse cx="100" cy="136" rx="62" ry="6" fill="#000" opacity=".12" />
    {SPINE.map((c, i) => { const w = 96 - ((i * 17) % 28), x = 100 - w / 2 + ((i * 9) % 12) - 6, y = 118 - i * 17;
      return <g key={i} className="fx-drop" style={{ animationDelay: `${i * 0.35}s` }}>
        <rect x={x} y={y} width={w} height="15" rx="3" fill={c} /><rect x={x} y={y + 11} width={w} height="4" rx="2" fill="#000" opacity=".15" /><rect x={x + 8} y={y + 5} width={w * 0.4} height="3" rx="1.5" fill="#fff" opacity=".75" />
      </g>; })}
    <g className="fx-cap"><path d="M100 14 L148 32 L100 50 L52 32 Z" fill="#1e293b" /><path d="M76 42 V58 Q100 70 124 58 V42 L100 52 Z" fill="#334155" /><path d="M144 34 V56" stroke="#f59e0b" strokeWidth="2.4" /><circle cx="144" cy="58" r="3.4" fill="#f59e0b" /></g>
  </svg>;
}

/** Bars growing and a line climbing: "watch your score grow". */
export function ScoreGrow() {
  const bars = [34, 52, 44, 70, 88];
  return <svg className="fx-svg" viewBox="0 0 200 150" role="img" aria-label="Score bars growing upwards">
    <path d="M24 128 H182" stroke="#cbd5e1" strokeWidth="2" />
    {bars.map((h, i) => <rect key={i} className="fx-bar" x={32 + i * 31} y={128 - h} width="20" height={h} rx="4" fill={["#a5b4fc", "#818cf8", "#6366f1", "#4f46e5", "#16a34a"][i]} style={{ animationDelay: `${i * 0.18}s`, transformOrigin: `${42 + i * 31}px 128px` }} />)}
    <path className="fx-line" d="M42 86 L73 70 L104 80 L135 52 L166 34" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <g className="fx-star"><path d="M166 14 l3 6.4 7 .9 -5.1 4.9 1.2 7 -6.1 -3.4 -6.1 3.4 1.2 -7 -5.1 -4.9 7 -.9z" fill="#ffc83d" stroke="#e69a00" strokeWidth="1" /></g>
  </svg>;
}

/** Four animated tiles used on the landing page. */
export function StudyShowcase() {
  const tiles = [[OmrSheet, "Fill the bubbles", "OMR-style answer sheet and palette, just like exam day."], [Stopwatch, "Beat the clock", "Section timers keep your speed honest."], [BookStack, "Revise smart", "Explanations and weak-topic practice stack up fast."], [ScoreGrow, "Watch scores grow", "Every attempt shows exactly where you improved."]] as const;
  return <section className="stack" style={{ gap: 14 }}><h2 className="card-title" style={{ fontSize: "1.35rem" }}>Study. Test. Improve.</h2>
    <div className="fx-tiles">{tiles.map(([S, t, d]) => <article key={t} className="card fx-tile"><div className="fx-art"><S /></div><b>{t}</b><p className="sub">{d}</p></article>)}</div></section>;
}

/** Flipping-book loader (replaces the plain spinner). */
export function BookLoader() {
  return <div className="fx-bookload" aria-hidden="true"><div className="bk-spine" />{[0, 1, 2, 3].map((i) => <i key={i} className="bk-page" style={{ animationDelay: `${i * 0.35}s` }} />)}<div className="bk-left" /><div className="bk-right" /></div>;
}

/** Graduation caps tossed up when the student passes. */
export function CapToss() {
  return <div className="fx-captoss" aria-hidden="true">{[-46, 0, 46].map((x, i) => <svg key={i} viewBox="0 0 40 30" width="34" height="26" style={{ ["--x" as any]: `${x}px`, animationDelay: `${i * 0.18}s` }}><path d="M20 3 L38 10 L20 17 L2 10 Z" fill="#1e293b" /><path d="M10 14 V21 Q20 26 30 21 V14 L20 18 Z" fill="#334155" /><path d="M35 11 V20" stroke="#f59e0b" strokeWidth="1.8" /></svg>)}</div>;
}
