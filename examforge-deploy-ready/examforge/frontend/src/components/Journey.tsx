import type { CSSProperties } from "react";

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

/** Track from 0 to 100 percent. The train rests at `value`; a flag marks `goal`. Real numbers only. */
export function JourneyStrip({ value, goal, label, arrived }: { value: number; goal?: number | null; label: string; arrived?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value))), g = goal ? Math.max(1, Math.min(100, Math.round(goal))) : null;
  const done = g !== null && v >= g;
  return <figure className={`journey ${done ? "arrived" : ""}`} style={{ "--p": v, "--g": g ?? 100 } as CSSProperties} aria-label={`${label}: ${v}%${g ? `, goal ${g}%` : ""}${done ? ". Goal reached." : ""}`}>
    <div className="journey-track" aria-hidden="true">
      <div className="rail" />
      {[25, 50, 75].map((n) => <i key={n} className="sleeper" style={{ left: `calc(64px + (100% - 64px) * ${n} / 100)` }} />)}
      {g !== null && <span className="station" style={{ left: `calc(64px + (100% - 64px) * ${g} / 100)` }}><i /><b>{g}%</b></span>}
      <div className="journey-train"><Train puff={!done} /></div>
    </div>
    <figcaption className="sub">{label}: <b>{v}%</b>{g ? (done ? ` · ${arrived ?? "Goal reached"}` : ` · ${g - v} points to your ${g}% goal`) : ""}</figcaption>
  </figure>;
}

/** Looping train for loading states. */
export function TrainLoader({ text = "Loading" }: { text?: string }) {
  return <div className="train-loader" role="status"><div className="journey-track" aria-hidden="true"><div className="rail" /><div className="loop-train"><Train /></div></div><p className="sub">{text}</p></div>;
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
    {steps.map((s, i) => <li key={s} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}><i aria-hidden="true">{i < at ? "✓" : i + 1}</i><span>{s}</span>{i === at && <span className="start-train" aria-hidden="true"><Train puff={false} /></span>}</li>)}
  </ol>;
}
