// Remaining time is computed server-side from stored timestamps; client timers are display-only.
export interface TimingCtx {
  attemptStart: Date; testDurationSec: number;
  sectionStart: Date; sectionDurationSec: number;
  questionStart?: Date | null; questionSec?: number | null;
}
const rem = (start: Date, limitSec: number, now: Date) =>
  Math.max(0, limitSec - Math.floor((now.getTime() - start.getTime()) / 1000));

export function remaining(c: TimingCtx, now = new Date()) {
  const test = rem(c.attemptStart, c.testDurationSec, now);
  const section = Math.min(test, rem(c.sectionStart, c.sectionDurationSec, now));
  const question = c.questionStart && c.questionSec ? Math.min(section, rem(c.questionStart, c.questionSec, now)) : null;
  return { test, section, question, testExpired: test === 0, sectionExpired: section === 0, questionExpired: question === 0 };
}
// Priority: individual > section > global
export const effectiveQuestionSec = (q?: number | null, s?: number | null, g?: number | null) => q ?? s ?? g ?? null;
export const timerState = (sec: number) => (sec < 5 ? "critical" : sec <= 10 ? "warning" : "normal");

// Deterministic option shuffle that keeps the answer mapping correct.
export function shuffleOptions<T extends { key: string; text: string }>(opts: T[], correctKey: string, seed: number) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const arr = [...opts];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const keys = ["A", "B", "C", "D"];
  const correctText = opts.find((o) => o.key === correctKey)!.text;
  const options = arr.map((o, i) => ({ ...o, key: keys[i] }));
  return { options, correctKey: options.find((o) => o.text === correctText)!.key };
}
