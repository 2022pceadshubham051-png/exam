// Game layer: XP, levels, streaks and sound effects. Everything is derived on the client.
export const TITLES = ["Rookie", "Learner", "Challenger", "Strategist", "Champion", "Legend"];
export const levelFromXp = (xp: number) => {
  const level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2); // 100 xp -> L2, 300 -> L3, 600 -> L4 ...
  const base = (100 * (level - 1) * level) / 2, next = (100 * level * (level + 1)) / 2;
  return { level, into: xp - base, need: next - base, pct: Math.round(((xp - base) / (next - base)) * 100), title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))] };
};
export const xpFromAttempts = (done: any[]) => done.reduce((s, a) => s + 30 + Math.round(a.result?.percentage ?? 0), 0) + bonusXp();
export const bonusXp = () => { try { return Number(localStorage.getItem("ef_bonus_xp") || 0); } catch { return 0; } };
export const addBonusXp = (n: number) => { try { localStorage.setItem("ef_bonus_xp", String(bonusXp() + n)); } catch { /* ignore */ } };
/** True once each time the streak grows past the highest value this device has shown (drives the one-off flame bounce). */
export function streakBumped(n: number) { try { const seen = Number(localStorage.getItem("ef_streak_seen") || 0); localStorage.setItem("ef_streak_seen", String(n)); return n > seen; } catch { return false; } }
export const streakDays = (done: any[]) => {
  const days = new Set(done.map((a) => new Date(a.startedAt).toDateString())); let n = 0; const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
};
export const stars = (pct: number) => (pct >= 85 ? 3 : pct >= 60 ? 2 : pct >= 35 ? 1 : 0);
export const saveXp = (n: number) => { try { localStorage.setItem("ef_xp", String(n)); } catch { /* ignore */ } };
export const savedXp = () => { try { return Number(localStorage.getItem("ef_xp") || 0); } catch { return 0; } };
export const saveLevel = (level: number) => { try { localStorage.setItem("ef_level", String(level)); } catch { /* ignore */ } };
export const savedLevel = () => { try { return Number(localStorage.getItem("ef_level") || 0); } catch { return 0; } };

let ctx: AudioContext | null = null;
export const soundOn = () => { try { return localStorage.getItem("ef_sound") !== "off"; } catch { return true; } };
export const setSound = (on: boolean) => { try { localStorage.setItem("ef_sound", on ? "on" : "off"); } catch { /* ignore */ } window.dispatchEvent(new Event("ef-theme")); return on; };
export const toggleSound = () => setSound(!soundOn());
/** Practice mode: reveal the answer right after picking an option. Persisted so it is not reset on every question. */
export const instantCheckOn = () => { try { return localStorage.getItem("ef_instant") !== "off"; } catch { return true; } };
export const setInstantCheck = (on: boolean) => { try { localStorage.setItem("ef_instant", on ? "on" : "off"); } catch { /* ignore */ } };
const tone = (f: number, t0: number, dur: number, type: OscillatorType = "sine", vol = 0.07) => {
  if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, ctx.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
};
/** A soft steam-train whistle: two close notes that swell up with a little wobble. `base` is the lower note in Hz. */
const whistle = (t0: number, dur: number, base: number, vol = 0.045) => {
  if (!ctx) return; const t = ctx.currentTime + t0;
  for (const f of [base, base * 1.26]) {
    const o = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain(), g = ctx.createGain(); o.type = "triangle";
    o.frequency.setValueAtTime(f * 0.93, t); o.frequency.linearRampToValueAtTime(f, t + 0.09); lfo.frequency.value = 24; depth.gain.value = f * 0.011; lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.07); g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
};
export type Sfx = "pop" | "right" | "wrong" | "win" | "level" | "whistle" | "master";
export function sfx(kind: Sfx) {
  if (!soundOn()) return;
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)(); if (ctx.state === "suspended") void ctx.resume();
    if (kind === "pop") tone(520, 0, 0.09, "triangle");
    if (kind === "right") { tone(660, 0, 0.12, "triangle"); tone(990, 0.09, 0.18, "triangle"); }
    if (kind === "wrong") { tone(220, 0, 0.18, "sawtooth", 0.04); tone(165, 0.12, 0.25, "sawtooth", 0.04); }
    if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, "triangle"));
    if (kind === "level") [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "square", 0.04));
    if (kind === "whistle") whistle(0, 0.6, 700);
    if (kind === "master") { whistle(0, 0.45, 640); whistle(0.55, 0.8, 760); [784, 988, 1175].forEach((f, i) => tone(f, 1.0 + i * 0.1, 0.3, "triangle", 0.05)); }
  } catch { /* audio is optional */ }
}
