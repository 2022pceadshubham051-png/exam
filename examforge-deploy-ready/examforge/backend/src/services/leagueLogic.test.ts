import { describe, it, expect } from "vitest";
import { weekStart, nextWeekStart, weeklyPoints, tierOf, istStart, POINTS } from "./leagueLogic";

describe("league", () => {
  it("week starts on Monday", () => {
    expect(weekStart("2026-10-24")).toBe("2026-10-19"); // Saturday
    expect(weekStart("2026-10-19")).toBe("2026-10-19"); // Monday
    expect(weekStart("2026-10-25")).toBe("2026-10-19"); // Sunday
    expect(nextWeekStart("2026-10-24")).toBe("2026-10-26");
  });
  it("istStart is 5.5h before UTC midnight", () => {
    expect(istStart("2026-10-19").toISOString()).toBe("2026-10-18T18:30:00.000Z");
  });
  it("scores daily, tests (capped) and duel wins", () => {
    expect(weeklyPoints({ dailyCorrect: [8] })).toBe(8 * POINTS.dailyCorrect + POINTS.dailyFinish);
    expect(weeklyPoints({ testCorrect: [500] })).toBe(POINTS.testCorrectCap + POINTS.testFinish);
    expect(weeklyPoints({ duelWins: 2 })).toBe(60);
    expect(weeklyPoints({})).toBe(0);
  });
  it("tiers", () => {
    expect(tierOf(0)).toBe("bronze"); expect(tierOf(300)).toBe("silver");
    expect(tierOf(800)).toBe("gold"); expect(tierOf(5000)).toBe("diamond");
  });
});
