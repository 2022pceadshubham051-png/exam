import { Router } from "express";
import { prisma } from "../lib/db"; import { requireAuth } from "../middleware/auth";
import { dayKey, award } from "../services/coins";
import { weekStart, nextWeekStart, istStart, weeklyPoints, tierOf } from "../services/leagueLogic";
import { DUEL_COINS } from "../services/quizLogic"; import { cosmetics } from "../services/shopCatalog";
import { wrap } from "./util";

export const league = Router(); league.use(requireAuth);
let cache: { key: string; at: number; rows: any[] } | null = null;

/** Everyone's points for the current week (cached for a minute: it is the same for all students). */
async function standings(ws: string) {
  if (cache && cache.key === ws && Date.now() - cache.at < 60_000) return cache.rows;
  const from = istStart(ws);
  const [daily, tests, wins] = await Promise.all([
    prisma.dailyEntry.findMany({ where: { day: { gte: ws }, finishedAt: { not: null }, late: false }, select: { userId: true, correct: true }, take: 20_000 }),
    prisma.testResult.findMany({ where: { attempt: { endedAt: { gte: from }, status: { not: "IN_PROGRESS" } } }, select: { correct: true, attempt: { select: { userId: true } } }, take: 20_000 }),
    prisma.coinTx.findMany({ where: { reason: "duel", amount: DUEL_COINS.win, createdAt: { gte: from } }, select: { userId: true }, take: 20_000 }),
  ]);
  const by = new Map<string, { dailyCorrect: number[]; testCorrect: number[]; duelWins: number }>(), get = (u: string) => by.get(u) ?? by.set(u, { dailyCorrect: [], testCorrect: [], duelWins: 0 }).get(u)!;
  for (const d of daily) get(d.userId).dailyCorrect.push(d.correct);
  for (const t of tests) get(t.attempt.userId).testCorrect.push(t.correct);
  for (const w of wins) get(w.userId).duelWins++;
  const ids = [...by.keys()], users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, displayName: true, inventory: true } }), name = new Map(users.map((u) => [u.id, u]));
  const rows = ids.map((id) => ({ userId: id, points: weeklyPoints(by.get(id)!), u: name.get(id) })).filter((r) => r.u && r.points > 0).sort((a, b) => b.points - a.points || (a.userId < b.userId ? -1 : 1));
  cache = { key: ws, at: Date.now(), rows };
  return rows;
}

league.get("/league", wrap(async (req, res) => {
  const today = dayKey(), ws = weekStart(today), rows = await standings(ws), me = req.user!.id;
  const idx = rows.findIndex((r) => r.userId === me);
  res.json({
    weekStart: ws, resetsOn: nextWeekStart(today), total: rows.length,
    me: idx >= 0 ? { rank: idx + 1, points: rows[idx].points, tier: tierOf(rows[idx].points) } : { rank: null, points: 0, tier: "bronze" },
    rows: rows.slice(0, 25).map((r, i) => ({ rank: i + 1, name: r.u!.displayName ?? r.u!.name, points: r.points, tier: tierOf(r.points), isMe: r.userId === me, ...cosmetics(r.u!.inventory) })),
  });
}));

/** Last week's top 3 get a one-time coin prize when they open the league (idempotent per week). */
league.post("/league/claim", wrap(async (req, res) => {
  const today = dayKey(), prev = (() => { const d = new Date(weekStart(today) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 7); return d.toISOString().slice(0, 10); })();
  const rows = await standings(prev), idx = rows.findIndex((r) => r.userId === req.user!.id), prize = [150, 100, 60][idx] ?? 0;
  const paid = prize ? await award(req.user!.id, prize, "league", prev) : false;
  res.json({ week: prev, rank: idx >= 0 ? idx + 1 : null, coins: paid ? prize : 0 });
}));
