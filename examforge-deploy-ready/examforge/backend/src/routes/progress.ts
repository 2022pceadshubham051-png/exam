import { Router } from "express"; import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { compareAttempts, trend, weakAndStrong, periodFilter, type AttemptSummary } from "../services/analytics/analytics";
export const progress = Router(); progress.use(requireAuth);
progress.get("/progress", async (req: AuthedReq, res) => {
  const period = (["last5", "last10", "30d", "90d", "all"].includes(String(req.query.period)) ? req.query.period : "all") as any;
  const all = await prisma.testAttempt.findMany({ where: { userId: req.user!.id, result: { isNot: null } }, orderBy: { startedAt: "asc" }, include: { result: true, test: { select: { name: true } } } });
  const att = periodFilter(all.map((a: any) => ({ date: a.startedAt as Date, id: a.id, name: a.test.name, r: a.result })), period);
  if (!att.length) return res.json({ empty: true });
  const sums: AttemptSummary[] = att.map((a: any) => a.r);
  const last = sums[sums.length - 1], prev = sums[sums.length - 2];
  const resp = await prisma.questionResponse.findMany({ where: { attemptId: { in: att.map((a: any) => a.id) }, isCorrect: { not: null } }, select: { topic: true, isCorrect: true } });
  const by: Record<string, { topic: string; correct: number; total: number }> = {};
  for (const r of resp) { const k = r.topic ?? "Unknown"; const e = (by[k] ??= { topic: k, correct: 0, total: 0 }); e.total++; if (r.isCorrect) e.correct++; }
  const fastest = sums.filter((s) => s.unanswered === 0).sort((a, b) => a.timeTakenSec - b.timeTakenSec)[0];
  res.json({ empty: false, attempts: sums.length, questionsSolved: resp.length, comparison: compareAttempts(last, prev),
    current: { percentage: last.percentage, accuracy: last.accuracy }, change: prev ? { percentage: +(last.percentage - prev.percentage).toFixed(1), accuracy: +(last.accuracy - prev.accuracy).toFixed(1) } : null,
    trends: { score: trend(sums, "percentage"), accuracy: trend(sums, "accuracy"), attemptRate: trend(sums, "attemptRate"), time: trend(sums, "timeTakenSec") },
    ...weakAndStrong(Object.values(by)),
    best: { percentage: Math.max(...sums.map((s) => s.percentage)), accuracy: Math.max(...sums.map((s) => s.accuracy)), fastestSec: fastest?.timeTakenSec ?? null, mostCorrect: Math.max(...sums.map((s) => s.correct)) },
    avgPercentage: +(sums.reduce((a, s) => a + s.percentage, 0) / sums.length).toFixed(1) });
});
