import { useEffect, useState, type CSSProperties } from "react";
import { getSkin, type Skin } from "../lib/skin";

/** Current exam skin; re-renders when the exam or the student's override changes. */
export function useSkin(): Skin {
  const [s, set] = useState<Skin>(getSkin);
  useEffect(() => { const f = () => set(getSkin()); window.addEventListener("ef-skin", f); f(); return () => window.removeEventListener("ef-skin", f); }, []);
  return s;
}

/** One illustration style for all "journey" art: flat violet + gold line shapes, decorative only (aria-hidden). */
export function Train({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--surface-3)"><circle className="puff p1" cx="14" cy="6" r="3" /><circle className="puff p2" cx="14" cy="6" r="3" /><circle className="puff p3" cx="14" cy="6" r="3" /></g>}
    <rect x="30" y="8" width="30" height="16" rx="3" fill="var(--brand)" /><rect x="30" y="14" width="30" height="3" fill="var(--gold)" />
    <rect x="4" y="12" width="28" height="12" rx="3" fill="var(--brand)" /><rect x="11" y="6" width="7" height="8" rx="1.5" fill="var(--text)" />
    <rect x="36" y="11" width="6" height="4" rx="1" fill="var(--brand-soft)" /><rect x="46" y="11" width="6" height="4" rx="1" fill="var(--brand-soft)" />
    <g className="wheels" fill="var(--text)"><circle cx="12" cy="27" r="4.5" /><circle cx="26" cy="27" r="4.5" /><circle cx="40" cy="27" r="4.5" /><circle cx="54" cy="27" r="4.5" /></g>
    <g fill="var(--gold)"><circle cx="12" cy="27" r="1.6" /><circle cx="26" cy="27" r="1.6" /><circle cx="40" cy="27" r="1.6" /><circle cx="54" cy="27" r="1.6" /></g>
  </svg>;
}

/** Library skin: a book cart. Books stack up as you progress. */
export function BookCart({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--gold)"><circle className="puff p1" cx="30" cy="4" r="2" /><circle className="puff p2" cx="30" cy="4" r="2" /><circle className="puff p3" cx="30" cy="4" r="2" /></g>}
    <rect x="14" y="21" width="38" height="3" rx="1.5" fill="var(--text)" /><rect x="10" y="12" width="3" height="12" rx="1.5" fill="var(--text)" />
    <rect x="18" y="14" width="30" height="7" rx="1" fill="var(--brand)" /><rect x="18" y="17" width="30" height="1.6" fill="var(--gold)" />
    <rect x="22" y="8" width="24" height="6" rx="1" fill="var(--gold)" /><rect x="22" y="10.5" width="24" height="1.4" fill="var(--brand-soft)" />
    <rect x="26" y="3" width="17" height="5" rx="1" fill="var(--brand-2)" /><path d="M38 3 v7 l2-1.6 l2 1.6 V3Z" fill="var(--gold)" />
    <g className="wheels" fill="var(--text)"><circle cx="22" cy="28" r="4.5" /><circle cx="46" cy="28" r="4.5" /></g><g fill="var(--gold)"><circle cx="22" cy="28" r="1.6" /><circle cx="46" cy="28" r="1.6" /></g>
  </svg>;
}

/** Ground skin: a runner. */
export function Runner({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--surface-3)"><circle className="puff p1" cx="22" cy="30" r="2.5" /><circle className="puff p2" cx="22" cy="30" r="2.5" /><circle className="puff p3" cx="22" cy="30" r="2.5" /></g>}
    <circle cx="44" cy="6" r="4" fill="var(--text)" /><path d="M43 11 L36 21 M43 11 L51 17 L56 14 M43 11 L37 8 L31 12" stroke="var(--brand)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M36 21 L42 27 L36 32 M36 21 L28 24 L22 31" stroke="var(--brand)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="33" y="14" width="10" height="3" rx="1.5" fill="var(--gold)" transform="rotate(-50 38 15)" />
  </svg>;
}

/** SSC skin: a pen that writes the track. A little ink mist trails behind it. */
export function PenWriter({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--brand)"><circle className="puff p1" cx="9" cy="23" r="1.8" /><circle className="puff p2" cx="9" cy="23" r="1.4" /><circle className="puff p3" cx="9" cy="23" r="1.1" /></g>}
    <g className="tv pen-g">
      <rect x="9" y="12" width="33" height="10" rx="5" fill="var(--brand)" />
      <rect x="9" y="12" width="9" height="10" rx="4.5" fill="var(--text)" />
      <rect x="20" y="10.2" width="17" height="2.6" rx="1.3" fill="var(--gold)" />
      <rect x="41" y="13" width="7" height="8" rx="1" fill="var(--text)" />
      <path d="M48 13.2 L61.5 17.4 L48 21.6 Z" fill="var(--gold)" />
      <path d="M50 17.4 H60" stroke="var(--text)" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      <circle cx="53.5" cy="17.4" r="1.1" fill="var(--text)" />
    </g>
  </svg>;
}

/** Bank skin: a rupee coin that rolls (it narrows to its edge and turns back). */
export function RupeeCoin({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--gold)"><circle className="puff p1" cx="22" cy="28" r="2" /><circle className="puff p2" cx="22" cy="28" r="1.6" /><circle className="puff p3" cx="22" cy="28" r="1.2" /></g>}
    <ellipse cx="42" cy="31" rx="12" ry="2" fill="var(--text)" opacity=".16" />
    <g className="tv coin-g">
      <circle cx="42" cy="16" r="13.5" fill="var(--gold)" />
      <circle cx="42" cy="16" r="10.5" fill="none" stroke="var(--gold-text)" strokeWidth="1.2" opacity=".55" />
      <path d="M37.5 11 H46.5 M37.5 15 H46.5 M37.5 11 H41 a4 4 0 0 1 0 8 H37.5 L45.5 25" fill="none" stroke="var(--gold-ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>;
}

/** NEET skin: a heart that beats, trailing a line from the monitor. */
export function Heartbeat({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    <path className="tv ecg-line" d="M1 21 H12 L16 21 L19.5 12 L24 29 L28 17 L30.5 21 H36" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {puff && <circle className="tv ecg-blip" cx="36" cy="21" r="1.8" fill="var(--brand)" />}
    <path className="tv heart-g" d="M49 28.5 C37.5 21 37.5 9.5 44.2 8.6 C47.2 8.2 49 10.6 49 12.2 C49 10.6 50.8 8.2 53.8 8.6 C60.5 9.5 60.5 21 49 28.5Z" fill="var(--gold)" />
    <path d="M43.5 12.2 C42 13 41.6 14.8 42.4 16.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
  </svg>;
}

/** Lab skin: an atom whose electrons orbit the nucleus. */
export function Atom({ puff = true, className = "" }: { puff?: boolean; className?: string }) {
  return <svg className={`train ${className}`} width="64" height="34" viewBox="0 0 64 34" aria-hidden="true" focusable="false">
    {puff && <g className="puffs" fill="var(--gold)"><circle className="puff p1" cx="26" cy="22" r="1.6" /><circle className="puff p2" cx="26" cy="22" r="1.3" /><circle className="puff p3" cx="26" cy="22" r="1" /></g>}
    <g className="tv atom-g">
      <g fill="none" stroke="var(--brand)" strokeWidth="1.6">
        <ellipse cx="42" cy="17" rx="15" ry="5.6" /><ellipse cx="42" cy="17" rx="15" ry="5.6" transform="rotate(60 42 17)" /><ellipse cx="42" cy="17" rx="15" ry="5.6" transform="rotate(120 42 17)" />
      </g>
      <circle cx="57" cy="17" r="2.2" fill="var(--gold)" /><circle cx="34.5" cy="30" r="2.2" fill="var(--gold)" /><circle cx="34.5" cy="4" r="2.2" fill="var(--gold)" />
    </g>
    <circle cx="42" cy="17" r="4" fill="var(--text)" /><circle cx="42" cy="17" r="1.6" fill="var(--gold)" />
  </svg>;
}

/** The traveller for the current exam skin. */
export function Traveler({ puff = true, className = "", skin }: { puff?: boolean; className?: string; skin?: Skin }) {
  const cur = useSkin(), k = skin ?? cur;
  if (k === "library") return <BookCart puff={puff} className={className} />;
  if (k === "ground") return <Runner puff={puff} className={className} />;
  if (k === "ssc") return <PenWriter puff={puff} className={className} />;
  if (k === "bank") return <RupeeCoin puff={puff} className={className} />;
  if (k === "neet") return <Heartbeat puff={puff} className={className} />;
  if (k === "lab") return <Atom puff={puff} className={className} />;
  return <Train puff={puff} className={className} />;
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

/** Looping train for loading states. */
export function TrainLoader({ text = "Loading" }: { text?: string }) {
  return <div className="train-loader" role="status"><div className="journey-track" aria-hidden="true"><div className="rail" /><div className="loop-train"><Traveler /></div></div><p className="sub">{text}</p></div>;
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
