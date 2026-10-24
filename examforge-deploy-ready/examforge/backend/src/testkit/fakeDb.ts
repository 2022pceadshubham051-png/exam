// A tiny in-memory stand-in for the parts of Prisma used by the daily-challenge and duel routes, so the route logic
// (auth, grading, one-attempt rules, double-submit, rewards) can be tested without a database.
type Row = Record<string, any>;
const match = (row: Row, where: Row = {}): boolean => Object.entries(where).every(([k, v]) => {
  if (k === "OR") return (v as Row[]).some((w) => match(row, w));
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("not" in v) return v.not === null ? row[k] != null : row[k] !== v.not;
    if ("gt" in v) return row[k] > v.gt; if ("lt" in v) return row[k] < v.lt; if ("in" in v) return v.in.includes(row[k]);
    if ("startsWith" in v) return String(row[k]).startsWith(v.startsWith);
    return true; // nested relation filters are not modelled
  }
  return row[k] === v;
});
const dup = () => Object.assign(new Error("Unique constraint"), { code: "P2002" });

export function makeFakeDb() {
  const t = { questions: [] as Row[], challenges: [] as Row[], daily: [] as Row[], coins: [] as Row[], streaks: [] as Row[], users: new Map<string, Row>(), duels: [] as Row[], duelEntries: [] as Row[], ai: new Map<string, Row>(), usage: new Map<string, number>() };
  let n = 0; const id = () => `id${++n}`;
  const withUser = (e: Row) => ({ ...e, user: t.users.get(e.userId) ?? { name: "?", displayName: null } });
  const duelOut = (d: Row | undefined, inc?: Row) => (d && inc?.entries ? { ...d, entries: t.duelEntries.filter((e) => e.duelId === d.id).map(withUser) } : d);
  const api: any = {
    question: {
      findMany: async ({ where, include }: Row) => where?.id?.in ? where.id.in.map((i: string) => t.questions.find((q) => q.id === i)).filter(Boolean).map((q: Row) => ({ ...q, options: include ? q.options : undefined })) : t.questions.map((q) => ({ id: q.id })),
    },
    dailyChallenge: {
      findUnique: async ({ where }: Row) => t.challenges.find((c) => c.day === where.day) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => t.challenges.find((c) => c.day === where.day)!,
      createMany: async ({ data }: Row) => { for (const d of data) if (!t.challenges.some((c) => c.day === d.day)) t.challenges.push({ ...d }); return { count: data.length }; },
    },
    dailyEntry: {
      findUnique: async ({ where }: Row) => t.daily.find((e) => e.userId === where.userId_day.userId && e.day === where.userId_day.day) ?? null,
      findUniqueOrThrow: async ({ where }: Row) => (where.id ? t.daily.find((e) => e.id === where.id) : t.daily.find((e) => e.userId === where.userId_day.userId && e.day === where.userId_day.day))!,
      createMany: async ({ data }: Row) => { for (const d of data) if (!t.daily.some((e) => e.userId === d.userId && e.day === d.day)) t.daily.push({ id: id(), startedAt: new Date(), finishedAt: null, correct: 0, incorrect: 0, score: 0, timeSec: 0, late: false, answers: null, ...d }); return { count: 1 }; },
      updateMany: async ({ where, data }: Row) => { const hit = t.daily.filter((e) => match(e, where)); hit.forEach((e) => Object.assign(e, data)); return { count: hit.length }; },
      count: async ({ where }: Row) => t.daily.filter((e) => match(e, where)).length,
      findMany: async ({ where, take }: Row) => t.daily.filter((e) => match(e, where)).sort((a, b) => b.score - a.score || a.timeSec - b.timeSec).slice(0, take ?? 99).map(withUser),
    },
    coinTx: { create: async ({ data }: Row) => { if (t.coins.some((c) => c.userId === data.userId && c.reason === data.reason && c.ref === data.ref)) throw dup(); t.coins.push({ ...data }); return data; } },
    userStreak: {
      findUnique: async ({ where }: Row) => t.streaks.find((s) => s.userId === where.userId) ?? null,
      upsert: async ({ where, create, update }: Row) => { const s = t.streaks.find((x) => x.userId === where.userId); if (s) { for (const [k, v] of Object.entries(update)) s[k] = v && typeof v === "object" && "increment" in (v as any) ? (s[k] ?? 0) + (v as any).increment : v; return s; } const c = { freezesUsed: 0, ...create }; t.streaks.push(c); return c; },
    },
    user: { findUnique: async ({ where }: Row) => t.users.get(where.id) ?? null, update: async ({ where, data }: Row) => Object.assign(t.users.get(where.id)!, data) },
    duel: {
      count: async ({ where }: Row) => t.duels.filter((d) => d.creatorId === where.creatorId).length,
      create: async ({ data }: Row) => { if (t.duels.some((d) => d.code === data.code)) throw dup(); const { entries, ...d } = data; const row = { id: id(), createdAt: new Date(), ...d }; t.duels.push(row); if (entries?.create) t.duelEntries.push({ duelId: row.id, startedAt: new Date(), finishedAt: null, correct: 0, incorrect: 0, score: 0, timeSec: 0, answers: null, ...entries.create }); return row; },
      findUnique: async ({ where, include }: Row) => duelOut(t.duels.find((d) => d.code === where.code), include) ?? null,
      findMany: async ({ where }: Row) => t.duels.filter((d) => where.id.in.includes(d.id)).map((d) => duelOut(d, { entries: true })!),
    },
    duelEntry: {
      count: async ({ where }: Row) => t.duelEntries.filter((e) => match(e, where)).length,
      create: async ({ data }: Row) => { if (t.duelEntries.some((e) => e.duelId === data.duelId && e.userId === data.userId)) throw dup(); const row = { startedAt: new Date(), finishedAt: null, correct: 0, incorrect: 0, score: 0, timeSec: 0, answers: null, ...data }; t.duelEntries.push(row); return row; },
      findUniqueOrThrow: async ({ where }: Row) => t.duelEntries.find((e) => e.duelId === where.duelId_userId.duelId && e.userId === where.duelId_userId.userId)!,
      updateMany: async ({ where, data }: Row) => { const hit = t.duelEntries.filter((e) => match(e, where)); hit.forEach((e) => Object.assign(e, data)); return { count: hit.length }; },
      findMany: async ({ where }: Row) => t.duelEntries.filter((e) => match(e, where)),
    },
    aiExplanation: {
      findUnique: async ({ where }: Row) => t.ai.get(where.key) ?? null,
      upsert: async ({ where, create }: Row) => { t.ai.set(where.key, { ...create }); return create; },
    },
    aiUsage: { upsert: async ({ where }: Row) => { const k = `${where.userId_day.userId}:${where.userId_day.day}`; const c = (t.usage.get(k) ?? 0) + 1; t.usage.set(k, c); return { count: c }; } },
    $transaction: async (fn: any) => fn(api),
  };
  return { t, prisma: api };
}
export const mkQuestion = (i: number) => ({ id: `q${i}`, text: `Question ${i} about ratio and proportion?`, explanation: `Because ${i}`, subject: null, topic: null, correctKey: "ABCD"[i % 4], options: ["A", "B", "C", "D"].map((k) => ({ key: k, text: `opt ${k}` })) });
