// Pure streak rules (no database), so they can be unit-tested. Day keys are "YYYY-MM-DD" in India time.
export interface StreakState { current: number; best: number; lastDay: string | null; freezes: number }
export interface StreakView { current: number; best: number; doneToday: boolean; atRisk: boolean; freezes: number; coveredByFreeze: boolean; nextMilestone: number | null }

export const MILESTONES: Record<number, number> = { 3: 10, 7: 30, 14: 60, 30: 150, 60: 300, 100: 600 };

/** Whole days from day `a` to day `b` (b - a). */
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);

/**
 * Record study activity on `today`.
 * - same day: nothing changes
 * - next day: streak +1
 * - missed days: each missed day is covered by one streak freeze; if there are not enough freezes the streak restarts at 1
 */
export function applyActivity(s: StreakState, today: string): StreakState & { changed: boolean; freezesUsed: number; reset: boolean } {
  if (s.lastDay) {
    const diff = dayDiff(s.lastDay, today);
    if (diff <= 0) return { ...s, changed: false, freezesUsed: 0, reset: false }; // already counted today (or clock skew)
    const missed = diff - 1;
    if (missed === 0) { const current = s.current + 1; return { current, best: Math.max(s.best, current), lastDay: today, freezes: s.freezes, changed: true, freezesUsed: 0, reset: false }; }
    if (missed <= s.freezes && s.current > 0) { const current = s.current + 1; return { current, best: Math.max(s.best, current), lastDay: today, freezes: s.freezes - missed, changed: true, freezesUsed: missed, reset: false }; }
  }
  const reset = !!s.lastDay && s.current > 0;
  return { current: 1, best: Math.max(s.best, 1), lastDay: today, freezes: s.freezes, changed: true, freezesUsed: 0, reset };
}

/** What to show right now (without writing anything). A streak that can no longer be saved reads as 0. */
export function viewStreak(s: StreakState, today: string): StreakView {
  const next = Object.keys(MILESTONES).map(Number).sort((a, b) => a - b);
  const base = { best: s.best, freezes: s.freezes };
  if (!s.lastDay || s.current <= 0) return { ...base, current: 0, doneToday: false, atRisk: false, coveredByFreeze: false, nextMilestone: next[0] ?? null };
  const diff = dayDiff(s.lastDay, today), missed = Math.max(0, diff - 1);
  if (diff <= 0) return { ...base, current: s.current, doneToday: true, atRisk: false, coveredByFreeze: false, nextMilestone: next.find((m) => m > s.current) ?? null };
  if (missed <= s.freezes) return { ...base, current: s.current, doneToday: false, atRisk: true, coveredByFreeze: missed > 0, nextMilestone: next.find((m) => m > s.current) ?? null };
  return { ...base, current: 0, doneToday: false, atRisk: false, coveredByFreeze: false, nextMilestone: next[0] ?? null };
}
