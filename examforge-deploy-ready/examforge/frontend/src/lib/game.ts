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
export const toggleSound = () => { try { localStorage.setItem("ef_sound", soundOn() ? "off" : "on"); } catch { /* ignore */ } return soundOn(); };
const tone = (f: number, t0: number, dur: number, type: OscillatorType = "sine", vol = 0.07) => {
  if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, ctx.currentTime + t0); g.gain.linearRampToValueAtTime(vol, ctx.currentTime + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
};
export type Sfx = "pop" | "right" | "wrong" | "win" | "level";
export function sfx(kind: Sfx) {
  if (!soundOn()) return;
  try {
    ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)(); if (ctx.state === "suspended") void ctx.resume();
    if (kind === "pop") tone(520, 0, 0.09, "triangle");
    if (kind === "right") { tone(660, 0, 0.12, "triangle"); tone(990, 0.09, 0.18, "triangle"); }
    if (kind === "wrong") { tone(220, 0, 0.18, "sawtooth", 0.04); tone(165, 0.12, 0.25, "sawtooth", 0.04); }
    if (kind === "win") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, "triangle"));
    if (kind === "level") [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "square", 0.04));
  } catch { /* audio is optional */ }
}
