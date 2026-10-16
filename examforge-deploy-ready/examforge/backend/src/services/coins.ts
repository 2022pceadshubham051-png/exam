import { prisma } from "../lib/db";

export const DAILY_COINS = 15, WELCOME_COINS = 50;
// Day key in India time so "once a day" matches the student's calendar day.
export const dayKey = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** Idempotent: the same (user, reason, ref) can only ever be paid once. */
export async function award(userId: string, amount: number, reason: string, ref: string) {
  if (amount <= 0) return false;
  try { await prisma.coinTx.create({ data: { userId, amount, reason, ref } }); return true; }
  catch (e: any) { if (e?.code === "P2002") return false; throw e; }
}
export async function balance(userId: string) {
  const r = await prisma.coinTx.aggregate({ where: { userId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}
/** Turn finished attempts into coins (30 + score %). Safe to call any time; deleting history later never takes coins back. */
export async function syncEarnings(userId: string) {
  const [atts, have] = await Promise.all([
    prisma.testAttempt.findMany({ where: { userId, result: { isNot: null } }, select: { id: true, result: { select: { percentage: true } } } }),
    prisma.coinTx.findMany({ where: { userId, reason: "attempt" }, select: { ref: true } }),
  ]);
  const done = new Set(have.map((x) => x.ref));
  const rows = atts.filter((a) => !done.has(a.id)).map((a) => ({ userId, amount: 30 + Math.round(a.result?.percentage ?? 0), reason: "attempt", ref: a.id }));
  if (rows.length) await prisma.coinTx.createMany({ data: rows, skipDuplicates: true });
}
/** Lecture Pace XP pays 1 coin per 5 XP, only ever upwards. */
export async function awardLecturePace(userId: string, xp: number) {
  const target = Math.floor(Math.max(0, xp) / 5);
  const r = await prisma.coinTx.aggregate({ where: { userId, reason: "lecture-pace" }, _sum: { amount: true } });
  const diff = target - (r._sum.amount ?? 0);
  if (diff > 0) await award(userId, diff, "lecture-pace", String(target));
}
