import { describe, it, expect } from "vitest";
import { tr } from "./i18n";

// Every user-facing string in these screens goes through t("...") / tr("...") and must have a Hindi translation.
const FILES = ["components/DoubtButton.tsx", "components/QuizPlayer.tsx", "components/StreakBar.tsx", "components/GoalRing.tsx", "components/InstallPrompt.tsx", "components/ReportQuestion.tsx",
  "pages/Daily.tsx", "pages/Duels.tsx", "pages/Revise.tsx", "pages/Notebook.tsx", "pages/Home.tsx", "pages/League.tsx", "pages/Shop.tsx", "pages/Result.tsx", "pages/Review.tsx", "pages/Courses.tsx"];
const RE = /\b(?:t|tr)\(\s*"((?:[^"\\]|\\.)*)"/g;
const SRC = import.meta.glob("../{components,pages}/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const keysOf = (file: string) => [...(SRC[`../${file}`] ?? "").matchAll(RE)].map((m) => m[1].replace(/\\(.)/g, "$1"));

describe("Hindi coverage", () => {
  for (const f of FILES) {
    const keys = [...new Set(keysOf(f))];
    it(`${f}: all ${keys.length} strings have Hindi`, () => {
      const missing = keys.filter((k) => tr(k, "hi") === k && !/^[^A-Za-z]*$/.test(k));
      expect(missing).toEqual([]);
    });
  }
  it("Hindi text is Devanagari, not Roman-script Hindi, and keeps every {placeholder}", () => {
    for (const f of FILES) for (const k of new Set(keysOf(f))) {
      const hi = tr(k, "hi"); if (hi === k) continue;
      expect(hi, k).toMatch(/[ऀ-ॿ]/);
      for (const ph of k.match(/\{\w+\}/g) ?? []) expect(hi, `${k} -> ${hi}`).toContain(ph);
    }
  });
});
