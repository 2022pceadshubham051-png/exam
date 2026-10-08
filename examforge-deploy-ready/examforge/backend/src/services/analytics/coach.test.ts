import { it, expect } from "vitest";
import { rate, analyse } from "./coach";
import { blueprintById } from "../syllabus/blueprints";
const mk = (n: number, ok: number, subject: any, topic: string, sec = 30): any[] => Array.from({ length: n }, (_, i) => ({ subject, topic, correct: i < ok, timeSec: sec, ageDays: 1 }));
it("rates 0-100 and discounts tiny samples", () => {
  expect(rate(mk(2, 2, "quant", "x"))!.score).toBeLessThan(rate(mk(40, 36, "quant", "x"))!.score);
  expect(rate(mk(40, 36, "quant", "x"))!.level).toMatch(/Strong|Good/);
  expect(rate(mk(40, 5, "quant", "x"))!.level).toMatch(/Weak|Critical/);
});
it("computes readiness and focus", () => {
  const bp = blueprintById("ssc-cgl-t1")!;
  const rows = [...mk(30, 28, "quant", "Percentage"), ...mk(30, 8, "reasoning", "Coding-Decoding")];
  const a = analyse(rows, bp, 80);
  expect(a.coverage).toBe(50);
  expect(a.focus[0].topic).toBe("Coding-Decoding");
  expect(a.readiness).toBeGreaterThan(0);
});
