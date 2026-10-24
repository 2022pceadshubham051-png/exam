import { Router } from "express"; import { z } from "zod";
import { requireAuth } from "../middleware/auth"; import { getStreak, touchStreak } from "../services/streak";
import { award, dayKey } from "../services/coins"; import { prisma } from "../lib/db";
import { wrap } from "./util";

export const streak = Router(); streak.use(requireAuth);
streak.get("/streak", wrap(async (req, res) => res.json(await getStreak(req.user!.id))));

/**
 * The notebook lives on the student's device, so the server can only trust a claim, not verify it.
 * Rewards are therefore small and capped: 2 coins per card, up to 15 cards a day. 5+ cards keep the streak alive.
 */
export const REVISION_MAX_CARDS = 15, REVISION_STREAK_MIN = 5;
streak.post("/revision/claim", wrap(async (req, res) => {
  const { count } = z.object({ count: z.number().int().min(1).max(200) }).parse(req.body);
  const userId = req.user!.id, day = dayKey();
  const already = await prisma.coinTx.aggregate({ where: { userId, reason: "revision", ref: { startsWith: day } }, _sum: { amount: true } });
  const target = Math.min(count, REVISION_MAX_CARDS) * 2, diff = target - (already._sum.amount ?? 0);
  const paid = diff > 0 ? await award(userId, diff, "revision", `${day}:${target}`) : false;
  const st = count >= REVISION_STREAK_MIN ? await touchStreak(userId) : await getStreak(userId);
  res.json({ coins: paid ? diff : 0, streak: st });
}));
