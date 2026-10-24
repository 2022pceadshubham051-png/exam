import { Router } from "express"; import { z } from "zod";
import { prisma } from "../lib/db"; import { requireAuth } from "../middleware/auth";
import { award } from "../services/coins"; import { touchStreak } from "../services/streak";
import { questionPool, loadQuestions, forPlayer, reviewRows } from "../services/quiz";
import { pickQuestionIds, gradeQuiz, duelOutcome, newCode, secondsLeft, DUEL_COINS } from "../services/quizLogic";
import { wrap, fail } from "./util";

export const duels = Router(); duels.use(requireAuth);
const OPEN_HOURS = 48;
const nameOf = (u: { name: string; displayName: string | null }) => u.displayName ?? u.name;
const include = { entries: { include: { user: { select: { name: true, displayName: true } } } } } as const;

async function byCode(code: string) {
  const d = await prisma.duel.findUnique({ where: { code: code.toUpperCase() }, include });
  if (!d) throw fail(404, "No duel with that code. Check the link and try again.");
  return d;
}
const side = (e: any) => ({ userId: e.userId, score: e.score as number, correct: e.correct as number, timeSec: e.timeSec as number });

/** Full state of a duel as seen by `me`. Questions and answers are never included here. */
function view(d: Awaited<ReturnType<typeof byCode>>, me: string) {
  const mine = d.entries.find((e) => e.userId === me), other = d.entries.find((e) => e.userId !== me);
  const creator = d.entries.find((e) => e.userId === d.creatorId);
  const bothDone = d.entries.length === 2 && d.entries.every((e) => e.finishedAt);
  const out = bothDone ? duelOutcome(side(d.entries[0]), side(d.entries[1])) : null;
  const pub = (e: any) => ({ name: nameOf(e.user), score: e.score, correct: e.correct, timeSec: e.timeSec, isMe: e.userId === me });
  return {
    id: d.id, code: d.code, count: (d.questionIds as string[]).length, durationSec: d.durationSec, creator: creator ? nameOf(creator.user) : "A friend", iAmCreator: d.creatorId === me,
    expired: !other && !mine && Date.now() - d.createdAt.getTime() > OPEN_HOURS * 3_600_000,
    state: bothDone ? "done" : d.entries.length < 2 ? "waiting" : "playing",
    me: mine ? { joined: true, finished: !!mine.finishedAt } : { joined: false, finished: false },
    // Scores stay hidden until the viewer has finished too, so nobody plays against a known target.
    results: mine?.finishedAt ? { me: pub(mine), opponent: other?.finishedAt ? pub(other) : null, opponentName: other ? nameOf(other.user) : null, winner: out ? (out.winner === null ? "tie" : out.winner === me ? "me" : "opponent") : null, reason: out?.reason ?? null } : null,
  };
}

duels.post("/duels", wrap(async (req, res) => {
  const { count } = z.object({ count: z.union([z.literal(5), z.literal(10)]).default(5) }).parse(req.body ?? {});
  const userId = req.user!.id;
  const open = await prisma.duel.count({ where: { creatorId: userId, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
  if (open >= 10) throw fail(429, "You created many duels in the last hour. Wait a little before starting another.");
  const pool = await questionPool(); if (pool.length < count) throw fail(404, "Not enough questions yet for a duel.");
  const questionIds = pickQuestionIds(pool, `duel:${Date.now()}:${Math.random()}`, count), durationSec = count * 60;
  for (let i = 0; i < 6; i++) {
    try { const d = await prisma.duel.create({ data: { code: newCode(6), creatorId: userId, questionIds, durationSec, entries: { create: { userId } } } }); return res.json({ id: d.id, code: d.code, durationSec, remainingSec: durationSec, questions: forPlayer(await loadQuestions(questionIds)) }); }
    catch (e: any) { if (e?.code !== "P2002") throw e; } // code collision: try another
  }
  throw fail(500, "Could not create a duel code. Try again.");
}));

duels.get("/duels", wrap(async (req, res) => {
  const mine = await prisma.duelEntry.findMany({ where: { userId: req.user!.id }, orderBy: { startedAt: "desc" }, take: 30, select: { duelId: true } });
  const ds = await prisma.duel.findMany({ where: { id: { in: mine.map((m) => m.duelId) } }, include, orderBy: { createdAt: "desc" } });
  res.json(ds.map((d) => { const v = view(d, req.user!.id); return { code: v.code, count: v.count, state: v.state, finished: v.me.finished, opponent: d.entries.find((e) => e.userId !== req.user!.id) ? nameOf(d.entries.find((e) => e.userId !== req.user!.id)!.user) : null, winner: v.results?.winner ?? null, createdAt: d.createdAt }; }));
}));

duels.get("/duels/:code", wrap(async (req, res) => res.json(view(await byCode(req.params.code), req.user!.id))));

/** Join (or resume) a duel and get its questions. The clock is the server's. */
duels.post("/duels/:code/join", wrap(async (req, res) => {
  const userId = req.user!.id, d = await byCode(req.params.code);
  let mine = d.entries.find((e) => e.userId === userId);
  if (!mine) {
    if (d.entries.length >= 2) throw fail(409, "This duel already has two players.");
    if (Date.now() - d.createdAt.getTime() > OPEN_HOURS * 3_600_000) throw fail(410, "This duel link has expired. Ask your friend for a new one.");
    try {
      // Serializable: two people opening the same link at the same moment cannot both get the second seat.
      await prisma.$transaction(async (tx) => { if ((await tx.duelEntry.count({ where: { duelId: d.id } })) >= 2) throw fail(409, "This duel already has two players."); await tx.duelEntry.create({ data: { duelId: d.id, userId } }); }, { isolationLevel: "Serializable" });
    } catch (e: any) { if (e?.code === "P2034" || e?.code === "P2002") throw fail(409, "This duel already has two players."); throw e; }
    mine = (await prisma.duelEntry.findUniqueOrThrow({ where: { duelId_userId: { duelId: d.id, userId } } })) as any;
  }
  if (mine!.finishedAt) throw fail(409, "You already finished this duel.");
  res.json({ code: d.code, durationSec: d.durationSec, remainingSec: secondsLeft(mine!.startedAt, d.durationSec), questions: forPlayer(await loadQuestions(d.questionIds as string[])) });
}));

const body = z.object({ answers: z.array(z.object({ questionId: z.string().max(60), selectedKey: z.enum(["A", "B", "C", "D"]).nullable(), timeMs: z.number().int().min(0).max(3_600_000).optional() })).max(20) });
duels.post("/duels/:code/submit", wrap(async (req, res) => {
  const userId = req.user!.id, { answers } = body.parse(req.body), d = await byCode(req.params.code);
  const mine = d.entries.find((e) => e.userId === userId);
  if (!mine) throw fail(400, "Join the duel first.");
  if (mine.finishedAt) throw fail(409, "You already finished this duel.");
  const ids = d.questionIds as string[], qs = await loadQuestions(ids), g = gradeQuiz(qs, answers);
  const elapsed = Math.max(0, Math.round((Date.now() - mine.startedAt.getTime()) / 1000));
  // Time is capped at the limit; it only breaks ties, so stalling gains nothing.
  const timeSec = Math.min(elapsed, d.durationSec);
  const upd = await prisma.duelEntry.updateMany({ where: { duelId: d.id, userId, finishedAt: null }, data: { finishedAt: new Date(), correct: g.correct, incorrect: g.incorrect, score: g.score, timeSec, answers: answers as any } });
  if (!upd.count) throw fail(409, "You already finished this duel.");
  const fresh = await byCode(d.code);
  let paid = 0;
  if (fresh.entries.length === 2 && fresh.entries.every((e) => e.finishedAt)) {
    const out = duelOutcome(side(fresh.entries[0]), side(fresh.entries[1]));
    for (const e of fresh.entries) { const c = out.winner === null ? DUEL_COINS.tie : out.winner === e.userId ? DUEL_COINS.win : DUEL_COINS.lose; const ok = await award(e.userId, c, "duel", fresh.id); if (ok && e.userId === userId) paid = c; }
  }
  const streak = await touchStreak(userId);
  res.json({ ...view(fresh, userId), review: reviewRows(qs, g.perQuestion), coins: paid, streak });
}));

/** Review after finishing (reload-safe). */
duels.get("/duels/:code/review", wrap(async (req, res) => {
  const d = await byCode(req.params.code), mine = d.entries.find((e) => e.userId === req.user!.id);
  if (!mine?.finishedAt) throw fail(403, "Finish the duel to see the answers.");
  const qs = await loadQuestions(d.questionIds as string[]);
  res.json({ ...view(d, req.user!.id), review: reviewRows(qs, gradeQuiz(qs, (mine.answers as any[]) ?? []).perQuestion) });
}));
