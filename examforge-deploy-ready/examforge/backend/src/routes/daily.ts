import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { award, dayKey } from "../services/coins"; import { cosmetics } from "../services/shopCatalog";
import { touchStreak, getStreak } from "../services/streak";
import { questionPool, loadQuestions, forPlayer, reviewRows } from "../services/quiz";
import { pickQuestionIds, gradeQuiz, dailyCoins, secondsLeft } from "../services/quizLogic";
import { wrap, fail } from "./util";

export const daily = Router(); daily.use(requireAuth);
export const DAILY_COUNT = 10, DAILY_SEC = 600, GRACE_SEC = 120;

async function challenge(day: string) {
  const have = await prisma.dailyChallenge.findUnique({ where: { day } });
  if (have) return have.questionIds as string[];
  const pool = await questionPool();
  if (pool.length < 5) throw fail(404, "Not enough questions yet for a daily challenge. Please check back soon.");
  const ids = pickQuestionIds(pool, `daily:${day}`, DAILY_COUNT);
  // Two students opening the page at once: the unique key makes the second insert a no-op, then everybody reads the stored row.
  await prisma.dailyChallenge.createMany({ data: [{ day, questionIds: ids }], skipDuplicates: true });
  return (await prisma.dailyChallenge.findUniqueOrThrow({ where: { day } })).questionIds as string[];
}
async function finishedView(userId: string, day: string, ids: string[], e: any) {
  const qs = await loadQuestions(ids), per = gradeQuiz(qs, (e.answers as any[]) ?? []).perQuestion;
  const above = await prisma.dailyEntry.count({ where: { day, finishedAt: { not: null }, late: false, OR: [{ score: { gt: e.score } }, { score: e.score, timeSec: { lt: e.timeSec } }] } });
  return { status: "done" as const, day, summary: { score: e.score, correct: e.correct, incorrect: e.incorrect, unanswered: ids.length - e.correct - e.incorrect, total: ids.length, timeSec: e.timeSec, late: e.late, rank: e.late ? null : above + 1 }, review: reviewRows(qs, per), userId };
}

daily.get("/daily", wrap(async (req, res) => {
  const userId = req.user!.id, day = dayKey(), ids = await challenge(day);
  const [e, streak, players] = await Promise.all([prisma.dailyEntry.findUnique({ where: { userId_day: { userId, day } } }), getStreak(userId), prisma.dailyEntry.count({ where: { day, finishedAt: { not: null } } })]);
  const base = { day, count: ids.length, durationSec: DAILY_SEC, streak, players };
  if (e?.finishedAt) { const { userId: _u, ...v } = await finishedView(userId, day, ids, e); return res.json({ ...base, ...v }); }
  res.json({ ...base, status: e ? "playing" : "new" });
}));

/** Starts (or resumes) today's challenge. The clock is the server's: reloading the page does not give extra time. */
daily.post("/daily/start", wrap(async (req, res) => {
  const userId = req.user!.id, day = dayKey(), ids = await challenge(day);
  let e = await prisma.dailyEntry.findUnique({ where: { userId_day: { userId, day } } });
  if (e?.finishedAt) throw fail(409, "You already finished today's challenge. Come back tomorrow!");
  if (!e) { await prisma.dailyEntry.createMany({ data: [{ userId, day }], skipDuplicates: true }); e = await prisma.dailyEntry.findUniqueOrThrow({ where: { userId_day: { userId, day } } }); }
  res.json({ day, durationSec: DAILY_SEC, remainingSec: secondsLeft(e.startedAt, DAILY_SEC), questions: forPlayer(await loadQuestions(ids)) });
}));

const body = z.object({ answers: z.array(z.object({ questionId: z.string().max(60), selectedKey: z.enum(["A", "B", "C", "D"]).nullable(), timeMs: z.number().int().min(0).max(3_600_000).optional() })).max(50) });
daily.post("/daily/submit", wrap(async (req, res) => {
  const userId = req.user!.id, day = dayKey(), { answers } = body.parse(req.body), ids = await challenge(day);
  const e = await prisma.dailyEntry.findUnique({ where: { userId_day: { userId, day } } });
  if (!e) throw fail(400, "Start the challenge first.");
  if (e.finishedAt) throw fail(409, "You already finished today's challenge.");
  const qs = await loadQuestions(ids), g = gradeQuiz(qs, answers);
  const elapsed = Math.max(0, Math.round((Date.now() - e.startedAt.getTime()) / 1000)), late = elapsed > DAILY_SEC + GRACE_SEC;
  // updateMany with finishedAt:null makes a double-tap submit count once.
  const upd = await prisma.dailyEntry.updateMany({ where: { id: e.id, finishedAt: null }, data: { finishedAt: new Date(), correct: g.correct, incorrect: g.incorrect, score: g.score, timeSec: Math.min(elapsed, DAILY_SEC), late, answers: answers as any } });
  if (!upd.count) throw fail(409, "You already finished today's challenge.");
  const coins = dailyCoins(g.correct); await award(userId, coins, "daily-challenge", day);
  const streak = await touchStreak(userId);
  const fresh = await prisma.dailyEntry.findUniqueOrThrow({ where: { id: e.id } });
  const { userId: _u, ...view } = await finishedView(userId, day, ids, fresh);
  res.json({ ...view, coins, streak });
}));

daily.get("/daily/leaderboard", wrap(async (req, res) => {
  const day = dayKey();
  const rows = await prisma.dailyEntry.findMany({ where: { day, finishedAt: { not: null }, late: false }, orderBy: [{ score: "desc" }, { timeSec: "asc" }], take: 20, include: { user: { select: { name: true, displayName: true, inventory: true } } } });
  const mine = await prisma.dailyEntry.findUnique({ where: { userId_day: { userId: req.user!.id, day } } });
  res.json({ day, rows: rows.map((r, i) => ({ rank: i + 1, name: r.user.displayName ?? r.user.name, score: r.score, correct: r.correct, timeSec: r.timeSec, isMe: r.userId === req.user!.id, ...cosmetics(r.user.inventory) })), mine: mine?.finishedAt ? { score: mine.score, timeSec: mine.timeSec, late: mine.late } : null });
}));
