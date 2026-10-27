import { describe, it, expect } from "vitest";
import { matchScore, revisitStations, type Station } from "./weakTopics";

const st = (lessonId: string, n: number, title: string, subjectId = "s1"): Station => ({ lessonId, n, title, subjectId, subjectName: subjectId === "s1" ? "Maths" : "Reasoning" });
const maths = [st("l1", 1, "Percentage: basics and tricks"), st("l2", 2, "Profit and Loss"), st("l3", 3, "Simple Interest"), st("r1", 1, "Number Series", "s2")];

describe("matchScore", () => {
  it("scores a phrase inside the title highest", () => expect(matchScore("profit and loss", "Profit and Loss")).toBeGreaterThan(10));
  it("scores shared words", () => { expect(matchScore("Simple Interest formulas", "Simple Interest")).toBeGreaterThanOrEqual(0.5); expect(matchScore("Geometry", "Simple Interest")).toBe(0); });
  it("handles empty text", () => expect(matchScore("", "Anything")).toBe(0));
});

describe("revisitStations", () => {
  it("points a subject quiz at the lecture whose title matches the wrong topic", () => {
    const r = revisitStations([{ topic: "Profit and Loss", subject: "Maths" }, { topic: "Profit and Loss", subject: "Maths" }, { topic: "Simple Interest", subject: "Maths" }], maths, { kind: "subject", subjectId: "s1" });
    expect(r.items.map((x) => [x.lessonId, x.wrong, x.exact])).toEqual([["l2", 2, true], ["l3", 1, true]]); expect(r.unmatched).toBe(0);
  });
  it("only looks at lectures up to the quiz's own lecture for a lecture quiz", () => {
    const r = revisitStations([{ topic: "Simple Interest", subject: null }], maths, { kind: "lesson", lessonId: "l2" });
    expect(r.items).toHaveLength(1); expect(r.items[0]).toMatchObject({ lessonId: "l2", exact: false }); // l3 is later, so fall back to its own lecture
  });
  it("never sends a student to another subject", () => expect(revisitStations([{ topic: "Number Series", subject: null }], maths, { kind: "subject", subjectId: "s1" }).items.every((x) => x.lessonId !== "r1")).toBe(true));
  it("a subject quiz with no title match is counted, not guessed", () => {
    const r = revisitStations([{ topic: "Trigonometry", subject: "Maths" }], maths, { kind: "subject", subjectId: "s1" }); expect(r.items).toEqual([]); expect(r.unmatched).toBe(1);
  });
  it("merges topics that land on the same lecture and sorts by mistakes", () => {
    const r = revisitStations([{ topic: "Percentage", subject: null }, { topic: "Percentage tricks", subject: null }, { topic: "Profit and Loss", subject: null }], maths, { kind: "subject", subjectId: "s1" });
    expect(r.items[0]).toMatchObject({ lessonId: "l1", wrong: 2 }); expect(r.items[1]).toMatchObject({ lessonId: "l2", wrong: 1 });
  });
  it("uses the question subject when a question has no topic, and ignores Unknown", () => {
    const r = revisitStations([{ topic: null, subject: "Simple Interest" }, { topic: "Unknown", subject: null }], maths, { kind: "subject", subjectId: "s1" });
    expect(r.items.map((x) => x.lessonId)).toEqual(["l3"]); expect(r.unmatched).toBe(1);
  });
  it("returns nothing for an unknown anchor or when nothing was wrong", () => { expect(revisitStations([{ topic: "x", subject: null }], maths, { kind: "lesson", lessonId: "nope" }).items).toEqual([]); expect(revisitStations([], maths, { kind: "subject", subjectId: "s1" })).toEqual({ items: [], unmatched: 0 }); });
  it("caps the list", () => expect(revisitStations(maths.slice(0, 3).map((s) => ({ topic: s.title, subject: null })), maths, { kind: "subject", subjectId: "s1" }, 2).items).toHaveLength(2));
});
