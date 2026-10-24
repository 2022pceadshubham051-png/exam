import { describe, it, expect } from "vitest";
import { applyActivity, viewStreak, dayDiff, MILESTONES, type StreakState } from "./streakLogic";

const S = (current: number, lastDay: string | null, freezes = 0, best = current): StreakState => ({ current, best, lastDay, freezes });

describe("dayDiff", () => {
  it("counts calendar days, across month and year ends", () => {
    expect(dayDiff("2026-01-31", "2026-02-01")).toBe(1); expect(dayDiff("2025-12-31", "2026-01-01")).toBe(1); expect(dayDiff("2026-03-01", "2026-03-01")).toBe(0);
  });
});
describe("applyActivity", () => {
  it("starts a streak at 1", () => { expect(applyActivity(S(0, null), "2026-05-10")).toMatchObject({ current: 1, best: 1, lastDay: "2026-05-10", changed: true }); });
  it("does nothing when already counted today", () => { const r = applyActivity(S(4, "2026-05-10"), "2026-05-10"); expect(r.changed).toBe(false); expect(r.current).toBe(4); });
  it("adds one for the next day and tracks best", () => { expect(applyActivity(S(4, "2026-05-09", 0, 9), "2026-05-10")).toMatchObject({ current: 5, best: 9 }); expect(applyActivity(S(9, "2026-05-09", 0, 9), "2026-05-10").best).toBe(10); });
  it("resets to 1 after a missed day with no freeze, and says so", () => { expect(applyActivity(S(6, "2026-05-08"), "2026-05-10")).toMatchObject({ current: 1, reset: true, freezesUsed: 0 }); });
  it("uses one freeze per missed day and keeps the streak", () => { expect(applyActivity(S(6, "2026-05-08", 1), "2026-05-10")).toMatchObject({ current: 7, freezes: 0, freezesUsed: 1, reset: false }); });
  it("needs a freeze for EVERY missed day", () => { expect(applyActivity(S(6, "2026-05-07", 1), "2026-05-10")).toMatchObject({ current: 1, reset: true, freezes: 1 }); expect(applyActivity(S(6, "2026-05-07", 2), "2026-05-10")).toMatchObject({ current: 7, freezes: 0 }); });
  it("a first-ever reset is not reported as losing a streak", () => { expect(applyActivity(S(0, null), "2026-05-10").reset).toBe(false); });
  it("tolerates clock skew (last day in the future)", () => { expect(applyActivity(S(3, "2026-05-11"), "2026-05-10").changed).toBe(false); });
});
describe("viewStreak", () => {
  it("shows done-today", () => { expect(viewStreak(S(3, "2026-05-10"), "2026-05-10")).toMatchObject({ current: 3, doneToday: true, atRisk: false }); });
  it("shows at-risk the next morning", () => { expect(viewStreak(S(3, "2026-05-09"), "2026-05-10")).toMatchObject({ current: 3, doneToday: false, atRisk: true, coveredByFreeze: false }); });
  it("shows a streak as saved by a freeze, and as lost when it cannot be saved", () => {
    expect(viewStreak(S(3, "2026-05-08", 1), "2026-05-10")).toMatchObject({ current: 3, atRisk: true, coveredByFreeze: true });
    expect(viewStreak(S(3, "2026-05-07", 1), "2026-05-10")).toMatchObject({ current: 0, atRisk: false });
  });
  it("points at the next milestone", () => { expect(viewStreak(S(5, "2026-05-10"), "2026-05-10").nextMilestone).toBe(7); expect(viewStreak(S(0, null), "2026-05-10").nextMilestone).toBe(3); expect(viewStreak(S(100, "2026-05-10"), "2026-05-10").nextMilestone).toBeNull(); });
  it("view and apply agree: what view promises, apply delivers", () => {
    for (const [cur, last, fr] of [[5, "2026-05-09", 0], [5, "2026-05-08", 1], [5, "2026-05-07", 1], [5, "2026-05-01", 9]] as const) {
      const v = viewStreak(S(cur, last, fr), "2026-05-10"), a = applyActivity(S(cur, last, fr), "2026-05-10");
      expect(a.current).toBe(v.current > 0 ? v.current + 1 : 1);
    }
  });
});
describe("milestones", () => { it("pay more for longer streaks", () => { const v = Object.values(MILESTONES); expect([...v].sort((a, b) => a - b)).toEqual(v); }); });
