import { describe, it, expect } from "vitest";
import { schedule, buildSession, isMastered, GAPS, DAY, AGAIN_MS, localDay } from "./srs";

const NOW = 1_700_000_000_000;
describe("schedule", () => {
  it("good moves up one box and waits the box's gap", () => { expect(schedule(0, "good", NOW)).toEqual({ box: 1, due: NOW + 1 * DAY }); expect(schedule(2, "good", NOW)).toEqual({ box: 3, due: NOW + 7 * DAY }); });
  it("easy skips a box", () => { expect(schedule(1, "easy", NOW)).toEqual({ box: 3, due: NOW + 7 * DAY }); });
  it("never goes past the top box (30 days)", () => { expect(schedule(5, "good", NOW)).toEqual({ box: 5, due: NOW + 30 * DAY }); expect(schedule(4, "easy", NOW).box).toBe(5); });
  it("again resets to box 0 and comes back in minutes (same session)", () => { expect(schedule(4, "again", NOW)).toEqual({ box: 0, due: NOW + AGAIN_MS }); });
  it("hard keeps the box and halves the wait (at least a day)", () => { expect(schedule(3, "hard", NOW)).toEqual({ box: 3, due: NOW + 3 * DAY }); expect(schedule(1, "hard", NOW)).toEqual({ box: 1, due: NOW + 1 * DAY }); expect(schedule(0, "hard", NOW).due).toBe(NOW + DAY); });
  it("a full run of 'good' walks through exactly the gap table", () => { let box = 0, t = NOW; const seen: number[] = []; for (let i = 0; i < 5; i++) { const n = schedule(box, "good", t); seen.push((n.due - t) / DAY); box = n.box; t = n.due; } expect(seen).toEqual(GAPS); expect(isMastered(box)).toBe(true); });
  it("is compatible with cards saved by the old notebook (same gaps, box 0..5)", () => { expect(GAPS).toEqual([1, 3, 7, 14, 30]); });
});
describe("buildSession", () => {
  const c = (key: string, topic: string | null, due: number) => ({ key, topic, due });
  it("only includes cards that are due, most overdue first", () => {
    const s = buildSession([c("a", "x", NOW - 1), c("b", "x", NOW - 5 * DAY), c("later", "x", NOW + DAY)], NOW);
    expect(s.map((x) => x.key)).toEqual(["b", "a"]);
  });
  it("mixes topics instead of grouping them", () => {
    const s = buildSession([c("m1", "Math", 1), c("m2", "Math", 2), c("m3", "Math", 3), c("e1", "English", 4), c("e2", "English", 5)], NOW);
    expect(s.map((x) => x.topic)).toEqual(["Math", "English", "Math", "English", "Math"]);
  });
  it("respects the daily cap", () => { expect(buildSession(Array.from({ length: 40 }, (_, i) => c("k" + i, "t" + (i % 3), i)), NOW, 15)).toHaveLength(15); });
  it("returns nothing when nothing is due", () => { expect(buildSession([c("a", null, NOW + 1)], NOW)).toEqual([]); });
});
describe("localDay", () => { it("formats as YYYY-MM-DD", () => { expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05"); }); });
