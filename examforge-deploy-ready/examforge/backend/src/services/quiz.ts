import { prisma } from "../lib/db";
import { tagQuestion } from "./exam/attemptService";

let poolCache: { at: number; ids: string[] } | null = null;
export const resetPoolCache = () => { poolCache = null; };
/** Every question that belongs to a published test (cached for a few minutes; only ids are kept). */
export async function questionPool(): Promise<string[]> {
  if (poolCache && Date.now() - poolCache.at < 5 * 60_000) return poolCache.ids;
  const rows = await prisma.question.findMany({ where: { section: { test: { published: true } } }, select: { id: true } });
  poolCache = { at: Date.now(), ids: rows.map((r) => r.id) };
  return poolCache.ids;
}

/** Questions in the order of `ids`. `correctKey` and `explanation` are for the server only until the student has finished. */
export async function loadQuestions(ids: string[]) {
  const rows = await prisma.question.findMany({ where: { id: { in: ids } }, include: { options: true } });
  const by = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => by.get(id)).filter((q): q is NonNullable<typeof q> => !!q).map((q) => {
    const tag = tagQuestion(q);
    return { id: q.id, text: q.text, options: q.options.map((o) => ({ key: o.key, text: o.text })).sort((a, b) => a.key.localeCompare(b.key)), correctKey: q.correctKey, explanation: q.explanation ?? null, subject: tag.subject, topic: tag.topic };
  });
}
export const forPlayer = (qs: Awaited<ReturnType<typeof loadQuestions>>) => qs.map(({ correctKey: _c, explanation: _e, ...q }) => q);

/** Review rows (answers revealed) for a finished quiz. */
export function reviewRows(qs: Awaited<ReturnType<typeof loadQuestions>>, per: { questionId: string; selectedKey: string | null; isCorrect: boolean | null }[]) {
  const by = new Map(per.map((p) => [p.questionId, p]));
  return qs.map((q) => ({ questionId: q.id, text: q.text, options: q.options, topic: q.topic, subject: q.subject, correctKey: q.correctKey, explanation: q.explanation, selectedKey: by.get(q.id)?.selectedKey ?? null, isCorrect: by.get(q.id)?.isCorrect ?? null }));
}
