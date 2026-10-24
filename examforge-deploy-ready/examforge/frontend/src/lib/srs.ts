// Spaced-repetition rules for the mistake notebook. Pure functions (no storage, no DOM) so they are easy to test.
// Boxes: 0 = new or just forgotten, 1..5 = remembered 1..5 times in a row. Mastered = box 5.
export type Grade = "again" | "hard" | "good" | "easy";
export const GAPS = [1, 3, 7, 14, 30]; // days until the next review, by box 1..5
export const DAY = 86_400_000, AGAIN_MS = 10 * 60_000;
export const MAX_BOX = GAPS.length;
export const DAILY_CAP = 15;

const gapDays = (box: number) => GAPS[Math.min(Math.max(box, 1), MAX_BOX) - 1];

/** Next box and due time after answering a card. */
export function schedule(box: number, grade: Grade, now = Date.now()): { box: number; due: number } {
  if (grade === "again") return { box: 0, due: now + AGAIN_MS };
  if (grade === "hard") return { box, due: now + Math.max(1, Math.floor(gapDays(box) / 2)) * DAY }; // same box, come back sooner
  const nb = Math.min(box + (grade === "easy" ? 2 : 1), MAX_BOX);
  return { box: nb, due: now + gapDays(nb) * DAY };
}
export const isMastered = (box: number) => box >= MAX_BOX;

interface Card { key: string; topic?: string | null; due: number }
/**
 * Today's revision list: the most overdue cards first, but shuffled across topics so you do not get ten of the same topic in a row.
 */
export function buildSession<T extends Card>(cards: T[], now = Date.now(), cap = DAILY_CAP): T[] {
  const due = cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due || (a.key < b.key ? -1 : 1));
  const groups = new Map<string, T[]>();
  for (const c of due) { const k = c.topic ?? "-"; (groups.get(k) ?? groups.set(k, []).get(k)!).push(c); }
  const queues = [...groups.values()], out: T[] = [];
  while (out.length < cap && queues.some((q) => q.length)) for (const q of queues) { const c = q.shift(); if (c && out.length < cap) out.push(c); }
  return out;
}

/** Local calendar day, used to count how many cards were revised today. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
