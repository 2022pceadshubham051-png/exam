// Weekly league scoring (pure). A week runs Monday 00:00 to Sunday 23:59 India time.
export const POINTS = { dailyCorrect: 10, dailyFinish: 20, testCorrect: 2, testCorrectCap: 100, testFinish: 20, duelWin: 30 };
export const TIERS = [{ id: "diamond", min: 1500 }, { id: "gold", min: 800 }, { id: "silver", min: 300 }, { id: "bronze", min: 0 }] as const;

/** Monday of the week that contains `day` ("YYYY-MM-DD"). */
export function weekStart(day: string): string {
  const d = new Date(day + "T00:00:00Z"), dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow); return d.toISOString().slice(0, 10);
}
/** The instant the given IST day starts, as a Date. */
export const istStart = (day: string) => new Date(Date.parse(day + "T00:00:00Z") - 5.5 * 3600_000);
export const nextWeekStart = (day: string) => { const d = new Date(weekStart(day) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); };

export interface WeekInput { dailyCorrect?: number[]; testCorrect?: number[]; duelWins?: number }
export function weeklyPoints(i: WeekInput) {
  const daily = (i.dailyCorrect ?? []).reduce((s, c) => s + c * POINTS.dailyCorrect + POINTS.dailyFinish, 0);
  const tests = (i.testCorrect ?? []).reduce((s, c) => s + Math.min(c * POINTS.testCorrect, POINTS.testCorrectCap) + POINTS.testFinish, 0);
  return daily + tests + (i.duelWins ?? 0) * POINTS.duelWin;
}
export const tierOf = (points: number) => TIERS.find((t) => points >= t.min)!.id;
