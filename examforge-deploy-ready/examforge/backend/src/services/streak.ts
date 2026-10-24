import { prisma } from "../lib/db";
import { award, dayKey } from "./coins";
import { readInv } from "./shopCatalog";
import { applyActivity, viewStreak, MILESTONES, type StreakState } from "./streakLogic";

async function load(userId: string): Promise<{ state: StreakState; inv: ReturnType<typeof readInv> }> {
  const [row, u] = await Promise.all([prisma.userStreak.findUnique({ where: { userId } }), prisma.user.findUnique({ where: { id: userId }, select: { inventory: true } })]);
  const inv = readInv(u?.inventory);
  return { state: { current: row?.current ?? 0, best: row?.best ?? 0, lastDay: row?.lastDay ?? null, freezes: inv.freezes }, inv };
}

export async function getStreak(userId: string) {
  const { state } = await load(userId);
  return viewStreak(state, dayKey());
}

/**
 * Call whenever the student does real study work (finishes a test, the daily challenge, a revision round).
 * Idempotent within a day. Returns what changed so the UI can celebrate.
 */
export async function touchStreak(userId: string) {
  const today = dayKey(), { state, inv } = await load(userId), r = applyActivity(state, today);
  if (!r.changed) return { ...viewStreak(state, today), changed: false, milestoneCoins: 0, freezesUsed: 0, reset: false };
  await prisma.userStreak.upsert({ where: { userId }, create: { userId, current: r.current, best: r.best, lastDay: r.lastDay, freezesUsed: r.freezesUsed }, update: { current: r.current, best: r.best, lastDay: r.lastDay, ...(r.freezesUsed ? { freezesUsed: { increment: r.freezesUsed } } : {}) } });
  if (r.freezesUsed) await prisma.user.update({ where: { id: userId }, data: { inventory: { ...inv, freezes: r.freezes } as any } });
  const bonus = MILESTONES[r.current] ?? 0;
  const paid = bonus ? await award(userId, bonus, "streak-milestone", String(r.current)) : false;
  return { ...viewStreak({ current: r.current, best: r.best, lastDay: r.lastDay, freezes: r.freezes }, today), changed: true, milestoneCoins: paid ? bonus : 0, freezesUsed: r.freezesUsed, reset: r.reset };
}
