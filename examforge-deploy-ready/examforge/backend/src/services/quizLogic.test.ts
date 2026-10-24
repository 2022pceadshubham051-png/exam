import { describe, it, expect } from "vitest";
import { pickQuestionIds, gradeQuiz, duelOutcome, dailyCoins, newCode, secondsLeft } from "./quizLogic";

const pool = Array.from({ length: 200 }, (_, i) => `q${i}`);
describe("pickQuestionIds", () => {
  it("is stable for the same seed regardless of pool order", () => { expect(pickQuestionIds(pool, "daily:2026-05-10", 10)).toEqual(pickQuestionIds([...pool].reverse(), "daily:2026-05-10", 10)); });
  it("changes from day to day", () => { expect(pickQuestionIds(pool, "daily:2026-05-10", 10)).not.toEqual(pickQuestionIds(pool, "daily:2026-05-11", 10)); });
  it("returns unique ids and never more than exist", () => { const p = pickQuestionIds([...pool, ...pool], "x", 10); expect(new Set(p).size).toBe(10); expect(pickQuestionIds(["a", "b"], "x", 10)).toHaveLength(2); });
});
describe("gradeQuiz", () => {
  const qs = [{ id: "a", correctKey: "A" }, { id: "b", correctKey: "B" }, { id: "c", correctKey: "C" }];
  it("scores +1/-0.25 and reports per-question results", () => {
    const g = gradeQuiz(qs, [{ questionId: "a", selectedKey: "A" }, { questionId: "b", selectedKey: "D" }]);
    expect(g).toMatchObject({ correct: 1, incorrect: 1, unanswered: 1, score: 0.75 });
    expect(g.perQuestion.map((p) => p.isCorrect)).toEqual([true, false, null]);
  });
  it("ignores answers for questions that are not in the quiz and keeps the last duplicate", () => {
    const g = gradeQuiz(qs, [{ questionId: "zzz", selectedKey: "A" }, { questionId: "a", selectedKey: "B" }, { questionId: "a", selectedKey: "A" }]);
    expect(g.correct).toBe(1); expect(g.incorrect).toBe(0);
  });
  it("cannot be gamed by sending nothing", () => { expect(gradeQuiz(qs, []).score).toBe(0); });
});
describe("duelOutcome", () => {
  const p = (userId: string, score: number, timeSec: number) => ({ userId, score, correct: score, timeSec });
  it("higher score wins", () => { expect(duelOutcome(p("a", 4, 200), p("b", 3, 10))).toEqual({ winner: "a", reason: "score" }); });
  it("equal score: faster wins", () => { expect(duelOutcome(p("a", 3, 90), p("b", 3, 60))).toEqual({ winner: "b", reason: "time" }); });
  it("identical result is a tie", () => { expect(duelOutcome(p("a", 3, 60), p("b", 3, 60))).toEqual({ winner: null, reason: "tie" }); });
});
describe("misc", () => {
  it("daily coins grow with correct answers up to a cap", () => { expect(dailyCoins(0)).toBe(10); expect(dailyCoins(5)).toBe(20); expect(dailyCoins(10)).toBe(30); expect(dailyCoins(99)).toBe(30); });
  it("codes use only unambiguous characters", () => { for (let i = 0; i < 200; i++) expect(newCode(6)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); });
  it("secondsLeft counts down from the server start and never goes negative", () => {
    const t0 = new Date("2026-01-01T00:00:00Z"); expect(secondsLeft(t0, 600, new Date(t0.getTime() + 100_000))).toBe(500); expect(secondsLeft(t0, 600, new Date(t0.getTime() + 9_000_000))).toBe(0);
  });
});
