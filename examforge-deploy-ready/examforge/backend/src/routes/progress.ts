import { Router } from "express";
import { prisma } from "../lib/db";
import { requireAuth, type AuthedReq } from "../middleware/auth";
import { compareAttempts, trend, weakAndStrong, periodFilter, type AttemptSummary } from "../services/analytics/analytics";

export const progress = Router();
progress.use(requireAuth);

function median(xs: number[]) {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

progress.get("/progress", async (req: AuthedReq, res) => {
  const period = (["last5", "last10", "30d", "90d", "all"].includes(String(req.query.period)) ? req.query.period : "all") as any;
  const all = await prisma.testAttempt.findMany({
    where: { userId: req.user!.id, mode: "EXAM", result: { isNot: null } },
    orderBy: { startedAt: "asc" },
    include: { result: true, test: { select: { name: true } } },
  });
  const att = periodFilter(all.map((a: any) => ({ date: a.startedAt as Date, id: a.id, name: a.test.name, r: a.result })), period);
  if (!att.length) return res.json({ empty: true });
  const sums: AttemptSummary[] = att.map((a: any) => a.r);
  const last = sums[sums.length - 1], prev = sums[sums.length - 2];
  const resp = await prisma.questionResponse.findMany({
    where: { attemptId: { in: att.map((a: any) => a.id) }, isCorrect: { not: null } },
    select: { topic: true, difficulty: true, isCorrect: true, timeSpentMs: true },
  });
  const by: Record<string, { topic: string; correct: number; total: number }> = {};
  for (const r of resp) {
    const k = r.topic ?? "Unknown"; const e = (by[k] ??= { topic: k, correct: 0, total: 0 });
    e.total++; if (r.isCorrect) e.correct++;
  }

  const times = resp.map((r) => Math.max(0, r.timeSpentMs) / 1000).filter((n) => n > 0);
  const correctTimes = resp.filter((r) => r.isCorrect).map((r) => r.timeSpentMs / 1000).filter((n) => n > 0);
  const timeBucketDefs = [[0, 20, "0–20s"], [21, 40, "21–40s"], [41, 60, "41–60s"], [61, 90, "61–90s"], [91, Infinity, "90s+"]] as const;
  const distribution = timeBucketDefs.map(([min, max, label]) => ({ label, count: times.filter((n) => n >= min && n <= max).length }));
  const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const avgAcc = resp.length ? resp.filter((r) => r.isCorrect).length / resp.length * 100 : 0;
  const profile = avg < 30 && avgAcc < 70 ? "FAST_INACCURATE" : avg > 60 && avgAcc >= 80 ? "ACCURATE_SLOW" : avg < 35 && avgAcc >= 80 ? "FAST_ACCURATE" : avg > 60 && avgAcc < 70 ? "SLOW_INACCURATE" : "BALANCED";

  const timeByDifficulty = ["EASY", "MEDIUM", "HARD"].map((difficulty) => {
    const xs = resp.filter((r) => r.difficulty === difficulty && r.timeSpentMs > 0);
    return { difficulty, questions: xs.length, avgSec: xs.length ? +((xs.reduce((s, r) => s + r.timeSpentMs, 0) / xs.length) / 1000).toFixed(1) : 0,
      accuracy: xs.length ? +((xs.filter((r) => r.isCorrect).length / xs.length) * 100).toFixed(1) : 0 };
  });
  const byTopicTime = new Map<string, { topic: string; totalMs: number; total: number; correct: number }>();
  for (const r of resp) {
    const topic = r.topic ?? "Unknown"; const row = byTopicTime.get(topic) ?? { topic, totalMs: 0, total: 0, correct: 0 };
    row.total += 1; row.totalMs += r.timeSpentMs; if (r.isCorrect) row.correct += 1; byTopicTime.set(topic, row);
  }
  const timeByTopic = [...byTopicTime.values()]
    .map((r) => ({ topic: r.topic, questions: r.total, avgSec: +(r.totalMs / Math.max(1, r.total) / 1000).toFixed(1), accuracy: +(r.correct / Math.max(1, r.total) * 100).toFixed(1) }))
    .sort((a, b) => b.questions - a.questions || b.avgSec - a.avgSec)
    .slice(0, 8);

  const fastest = sums.filter((s) => s.unanswered === 0).sort((a, b) => a.timeTakenSec - b.timeTakenSec)[0];
  res.json({
    empty: false,
    attempts: sums.length,
    questionsSolved: resp.length,
    comparison: compareAttempts(last, prev),
    current: { percentage: last.percentage, accuracy: last.accuracy },
    change: prev ? { percentage: +(last.percentage - prev.percentage).toFixed(1), accuracy: +(last.accuracy - prev.accuracy).toFixed(1) } : null,
    trends: { score: trend(sums, "percentage"), accuracy: trend(sums, "accuracy"), attemptRate: trend(sums, "attemptRate"), time: trend(sums, "timeTakenSec") },
    ...weakAndStrong(Object.values(by)),
    best: { percentage: Math.max(...sums.map((s) => s.percentage)), accuracy: Math.max(...sums.map((s) => s.accuracy)), fastestSec: fastest?.timeTakenSec ?? null, mostCorrect: Math.max(...sums.map((s) => s.correct)) },
    avgPercentage: +(sums.reduce((a, s) => a + s.percentage, 0) / sums.length).toFixed(1),
    timeAnalytics: {
      answeredQuestions: times.length,
      averageSec: +avg.toFixed(1),
      medianSec: +median(times).toFixed(1),
      fastestSec: times.length ? +Math.min(...times).toFixed(1) : 0,
      slowestSec: times.length ? +Math.max(...times).toFixed(1) : 0,
      accuracy: +avgAcc.toFixed(1),
      profile,
      distribution,
      byDifficulty: timeByDifficulty,
      byTopic: timeByTopic,
      correctAnswerAvgSec: correctTimes.length ? +(correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length).toFixed(1) : 0,
    },
  });
});
