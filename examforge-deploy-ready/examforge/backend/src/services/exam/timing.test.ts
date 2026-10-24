import { describe, it, expect } from "vitest";
import { remaining, effectiveQuestionSec, timerState, shuffleOptions } from "./timing";

const t0 = new Date("2026-01-01T10:00:00Z"), at = (sec: number) => new Date(t0.getTime() + sec * 1000);
const ctx = { attemptStart: t0, testDurationSec: 3600, sectionStart: t0, sectionDurationSec: 1200 };

describe("remaining (server-side clock)", () => {
  it("counts down from the stored start time", () => {
    expect(remaining(ctx, at(100))).toMatchObject({ test: 3500, section: 1100, question: null, testExpired: false });
  });
  it("section time can never exceed the time left in the whole test", () => {
    const r = remaining({ ...ctx, sectionDurationSec: 5000 }, at(3000));
    expect(r.section).toBe(600); expect(r.test).toBe(600);
  });
  it("flags a section as expired at exactly its limit, and clamps at zero afterwards", () => {
    expect(remaining(ctx, at(1200)).sectionExpired).toBe(true);
    expect(remaining(ctx, at(99999))).toMatchObject({ test: 0, section: 0, testExpired: true });
  });
  it("question timer is capped by the section timer", () => {
    // 1150s into a 1200s section: 50s of section left, but the question alone would allow 300-50=250s.
    const r = remaining({ ...ctx, questionStart: at(1100), questionSec: 300 }, at(1150));
    expect(r.section).toBe(50); expect(r.question).toBe(50);
  });
  it("question timer alone counts down when the section has plenty of time", () => {
    expect(remaining({ ...ctx, questionStart: at(10), questionSec: 60 }, at(30)).question).toBe(40);
  });
  it("ignores the question timer when none is configured", () => {
    expect(remaining({ ...ctx, questionStart: t0, questionSec: null }, at(10)).question).toBeNull();
  });
  it("a client with a wrong clock cannot gain time: only the passed Date matters", () => {
    expect(remaining(ctx, at(1)).test).toBe(3599);
  });
});

describe("effectiveQuestionSec", () => {
  it("prefers question over section over global", () => {
    expect(effectiveQuestionSec(30, 60, 90)).toBe(30);
    expect(effectiveQuestionSec(null, 60, 90)).toBe(60);
    expect(effectiveQuestionSec(undefined, null, 90)).toBe(90);
    expect(effectiveQuestionSec(null, null, null)).toBeNull();
  });
});

describe("timerState", () => {
  it("turns critical under 5s and warns up to 10s", () => {
    expect(timerState(4)).toBe("critical"); expect(timerState(5)).toBe("warning"); expect(timerState(10)).toBe("warning"); expect(timerState(11)).toBe("normal");
  });
});

describe("shuffleOptions", () => {
  const opts = [{ key: "A", text: "one" }, { key: "B", text: "two" }, { key: "C", text: "three" }, { key: "D", text: "four" }];
  it("is deterministic for a seed", () => {
    expect(shuffleOptions(opts, "B", 42)).toEqual(shuffleOptions(opts, "B", 42));
  });
  it("keeps the correct answer pointing at the same text for every seed", () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = shuffleOptions(opts, "C", seed);
      expect(s.options.find((o) => o.key === s.correctKey)!.text).toBe("three");
      expect(s.options.map((o) => o.key)).toEqual(["A", "B", "C", "D"]);
      expect(new Set(s.options.map((o) => o.text)).size).toBe(4);
    }
  });
});
