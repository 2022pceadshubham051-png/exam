import { Router } from "express";
import { prisma } from "../lib/db"; import { requireAuth } from "../middleware/auth";
import { ensureRefCode, REFERRER_COINS, INVITEE_COINS } from "../services/referral";
import { wrap } from "./util";

export const invite = Router(); invite.use(requireAuth);
invite.get("/invite", wrap(async (req, res) => {
  const userId = req.user!.id, code = await ensureRefCode(userId);
  const [joined, earned] = await Promise.all([prisma.user.count({ where: { referredBy: userId } }), prisma.coinTx.aggregate({ where: { userId, reason: "referral" }, _sum: { amount: true } })]);
  res.json({ code, joined, coinsEarned: earned._sum.amount ?? 0, referrerCoins: REFERRER_COINS, inviteeCoins: INVITEE_COINS });
}));
