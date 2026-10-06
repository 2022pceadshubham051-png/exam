export interface AttemptSummary { score: number; percentage: number; accuracy: number; attemptRate: number; correct: number; incorrect: number; unanswered: number; timeTakenSec: number }

export function compareAttempts(cur: AttemptSummary, prev?: AttemptSummary) {
  if (!prev) return { first: true, status: "FIRST" as const, message: "This is your first attempt at this test. Complete another attempt to unlock performance comparison." };
  const d = (a: number, b: number) => +(a - b).toFixed(1);
  const delta = { percentage: d(cur.percentage, prev.percentage), accuracy: d(cur.accuracy, prev.accuracy), attemptRate: d(cur.attemptRate, prev.attemptRate),
    correct: cur.correct - prev.correct, incorrect: cur.incorrect - prev.incorrect, unanswered: cur.unanswered - prev.unanswered, timeSec: cur.timeTakenSec - prev.timeTakenSec };
  // Multi-metric composite: score 50%, accuracy 30%, fewer mistakes 10%, speed 10%
  const speed = prev.timeTakenSec ? ((prev.timeTakenSec - cur.timeTakenSec) / prev.timeTakenSec) * 100 : 0;
  const wrong = prev.incorrect ? ((prev.incorrect - cur.incorrect) / prev.incorrect) * 100 : 0;
  const composite = delta.percentage * 0.5 + delta.accuracy * 0.3 + wrong * 0.1 + speed * 0.1;
  const status = composite >= 10 ? "GREAT" : composite >= 3 ? "IMPROVING" : composite > -3 ? "STABLE" : "DROPPED";
  const message = { GREAT: `Your score improved by ${delta.percentage}% compared with your previous attempt.`,
    IMPROVING: `Your performance has improved by ${delta.percentage}% compared with your previous attempt.`,
    STABLE: "Your performance is almost unchanged from your previous attempt.",
    DROPPED: `Your score decreased by ${Math.abs(delta.percentage)}% compared with your previous attempt.` }[status];
  return { first: false, status, message, delta, composite: +composite.toFixed(1) };
}
export const trend = (xs: AttemptSummary[], k: keyof AttemptSummary) => xs.map((a, i) => ({ attempt: i + 1, value: a[k] }));

export interface TopicRow { topic: string; correct: number; total: number }
export function weakAndStrong(rows: TopicRow[], minQ = 5, weakBelow = 65, strongFrom = 80) {
  const t = rows.filter((r) => r.total >= minQ).map((r) => ({ ...r, accuracy: +((r.correct / r.total) * 100).toFixed(1) }));
  return { weak: t.filter((r) => r.accuracy < weakBelow).sort((a, b) => a.accuracy - b.accuracy), strong: t.filter((r) => r.accuracy >= strongFrom).sort((a, b) => b.accuracy - a.accuracy) };
}
export function periodFilter<T extends { date: Date }>(xs: T[], p: "last5" | "last10" | "30d" | "90d" | "all") {
  if (p === "last5") return xs.slice(-5);
  if (p === "last10") return xs.slice(-10);
  if (p === "all") return xs;
  const cut = Date.now() - (p === "30d" ? 30 : 90) * 864e5;
  return xs.filter((x) => x.date.getTime() >= cut);
}
export function questionRepetition(hist: { correct: boolean; timeMs: number }[]) {
  if (hist.length < 2) return null;
  const [p, c] = hist.slice(-2);
  const lastRight = [...hist].reverse().findIndex((h) => h.correct);
  return { improved: !p.correct && c.correct, regressed: p.correct && !c.correct, weakConcept: (lastRight === -1 ? hist.length : lastRight) >= 3 };
}
