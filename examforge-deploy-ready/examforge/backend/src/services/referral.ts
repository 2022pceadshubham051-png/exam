import { prisma } from "../lib/db";
import { award } from "./coins";
import { newCode } from "./quizLogic";

export const REFERRER_COINS = 50, INVITEE_COINS = 25, MAX_REWARDED_INVITES = 10;

export async function ensureRefCode(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { refCode: true } });
  if (u?.refCode) return u.refCode;
  for (let i = 0; i < 6; i++) {
    try { return (await prisma.user.update({ where: { id: userId }, data: { refCode: newCode(7) }, select: { refCode: true } })).refCode!; }
    catch (e: any) { if (e?.code !== "P2002") throw e; }
  }
  throw new Error("Could not create an invite code.");
}

/** Pays both sides once, when the invited student finishes their first test. Capped per referrer so throwaway accounts cannot farm coins. */
export async function rewardReferral(inviteeId: string) {
  const u = await prisma.user.findUnique({ where: { id: inviteeId }, select: { referredBy: true } });
  if (!u?.referredBy || u.referredBy === inviteeId) return;
  const paidSoFar = await prisma.coinTx.count({ where: { userId: u.referredBy, reason: "referral" } });
  if (paidSoFar >= MAX_REWARDED_INVITES) { await award(inviteeId, INVITEE_COINS, "referred", "once"); return; }
  if (await award(u.referredBy, REFERRER_COINS, "referral", inviteeId)) await award(inviteeId, INVITEE_COINS, "referred", "once");
}

/** Everything that should happen after a student finishes a test. Never throws: a failure here must not lose their result. */
export async function afterSubmit(userId: string) {
  try { const { touchStreak } = await import("./streak"); await touchStreak(userId); await rewardReferral(userId); }
  catch (e: any) { console.error("afterSubmit failed:", e?.message); }
}
