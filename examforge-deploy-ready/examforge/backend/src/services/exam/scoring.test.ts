import { describe, it, expect } from "vitest";
import { calculateScore, groupPerformance, type ScoreInput } from "./scoring";

const r = (sel: string | null, correct = "A", extra: Partial<ScoreInput> = {}): ScoreInput => ({ selectedKey: sel, correctKey: correct, sectionId: "s1", timeSpentMs: 1000, ...extra });

describe("calculateScore", () => {
  it("awards +1 per correct and -0.25 per wrong by default", () => {
    const s = calculateScore([r("A"), r("A"), r("B"), r(null)]);
    expect(s).toMatchObject({ correct: 2, incorrect: 1, attempted: 3, unanswered: 1, score: 1.75, totalMarks: 4, negativeTotal: 0.25 });
  });
  it("never penalises skipped questions", () => {
    expect(calculateScore([r(null), r(null)]).score).toBe(0);
  });
  it("supports custom marking (+2 / -0.5)", () => {
    expect(calculateScore([r("A"), r("C")], 2, 0.5).score).toBe(1.5);
    expect(calculateScore([r("A"), r("C")], 2, 0.5).totalMarks).toBe(4);
  });
  it("can go negative when most answers are wrong", () => {
    expect(calculateScore([r("B"), r("B"), r("B"), r("B")]).score).toBe(-1);
  });
  it("accuracy is correct/attempted and attempt rate is attempted/total", () => {
    const s = calculateScore([r("A"), r("B"), r(null), r(null)]);
    expect(s.accuracy).toBe(50); expect(s.attemptRate).toBe(50);
  });
  it("handles an empty paper without dividing by zero", () => {
    expect(calculateScore([])).toMatchObject({ score: 0, totalMarks: 0, accuracy: 0, attemptRate: 0 });
  });
  it("rounds to 2 decimals so float noise never reaches the result page", () => {
    expect(calculateScore([r("B"), r("B"), r("B")], 1, 0.1).score).toBe(-0.3);
  });
});

describe("groupPerformance", () => {
  it("groups by topic, labels missing values Unknown and averages time", () => {
    const g = groupPerformance([r("A", "A", { topic: "Algebra", timeSpentMs: 10_000 }), r("B", "A", { topic: "Algebra", timeSpentMs: 20_000 }), r("A", "A", { topic: null })], "topic");
    expect(g.Algebra).toMatchObject({ correct: 1, incorrect: 1, avgTimeSec: 15 });
    expect(g.Unknown.correct).toBe(1);
  });
});
