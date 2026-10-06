import { prisma } from "../../lib/db";
import { remaining, effectiveQuestionSec, shuffleOptions } from "./timing";
import { calculateScore, groupPerformance, type ScoreInput } from "./scoring";
import { compareAttempts } from "../analytics/analytics";

type Opt = { key: string; text: string };
// Presented (possibly shuffled) options; selectedKey is stored in presented space.
export function present(q: { id: string; options: Opt[]; correctKey: string }, shuffle: boolean, seed: number) {
  const base = [...q.options].sort((a, b) => a.key.localeCompare(b.key));
  if (!shuffle) return { options: base, correctKey: q.correctKey };
  let h = seed; for (const c of q.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return shuffleOptions(base, q.correctKey, h);
}
const load = (id: string) => prisma.testAttempt.findUnique({ where: { id }, include: { test: { include: { sections: { orderBy: { order: "asc" }, include: { questions: { include: { options: true } } } } } }, sections: true } });

// Enforces timers server-side: advances/locks expired sections, auto-submits on expiry.
export async function sync(attemptId: string) {
  let a = await load(attemptId); if (!a) return null;
  for (let guard = 0; guard < 50 && a.status === "IN_PROGRESS"; guard++) {
    const sec = a.test.sections[a.currentSectionIdx]; const sa = a.sections.find((s) => s.sectionId === sec.id)!;
    const r = remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt, sectionDurationSec: sec.durationSec });
    if (r.testExpired) { await submit(a.id, true); break; }
    if (!r.sectionExpired) break;
    const last = a.currentSectionIdx >= a.test.sections.length - 1;
    if (last) { await submit(a.id, true); break; }
    const next = a.test.sections[a.currentSectionIdx + 1];
    await prisma.$transaction([
      prisma.sectionAttempt.update({ where: { id: sa.id }, data: { locked: true, endedAt: new Date() } }),
      prisma.sectionAttempt.create({ data: { attemptId: a.id, sectionId: next.id, startedAt: new Date() } }),
      prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: { increment: 1 } } }),
    ]);
    a = (await load(attemptId))!;
  }
  return load(attemptId);
}

export async function start(userId: string, testId: string) {
  const open = await prisma.testAttempt.findFirst({ where: { userId, testId, status: "IN_PROGRESS" } });
  if (open) return (await sync(open.id))!; // exam state recovery
  const test = await prisma.test.findUnique({ where: { id: testId }, include: { sections: { orderBy: { order: "asc" }, include: { questions: true } } } });
  if (!test?.published || !test.sections.length) throw new Error("Test not available");
  const n = await prisma.testAttempt.count({ where: { userId, testId } });
  const a = await prisma.testAttempt.create({ data: { userId, testId, attemptNo: n + 1, shuffleSeed: Math.floor(Math.random() * 2 ** 31),
    sections: { create: { sectionId: test.sections[0].id, startedAt: new Date() } },
    responses: { create: test.sections.flatMap((s) => s.questions.map((q) => ({ questionId: q.id, sectionId: s.id, topic: q.topic, difficulty: q.difficulty }))) } } });
  return (await sync(a.id))!;
}

// Client-safe view: NO correct answers.
export async function view(attemptId: string) {
  const a = await sync(attemptId); if (!a) return null;
  const sec = a.test.sections[a.currentSectionIdx]; const sa = a.sections.find((s) => s.sectionId === sec.id)!;
  const responses = await prisma.questionResponse.findMany({ where: { attemptId } });
  const questions = sec.questions.map((q) => {
    const r = responses.find((x) => x.questionId === q.id)!;
    const p = present(q as any, a.test.shuffleOptions, a.shuffleSeed);
    return { id: q.id, text: q.text, options: p.options, timeLimitSec: effectiveQuestionSec(q.timeLimitSec, sec.questionSec, a.test.globalQuestionSec),
      selectedKey: r.selectedKey, status: r.status, timeSpentMs: r.timeSpentMs };
  });
  return { id: a.id, status: a.status, serverNow: Date.now(), sectionIdx: a.currentSectionIdx, sectionCount: a.test.sections.length, sectionName: sec.name,
    remaining: remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt, sectionDurationSec: sec.durationSec }),
    questions, rules: { negative: a.test.negativeMarks, maxTabSwitches: a.test.maxTabSwitches, fullscreen: a.test.requireFullscreen } };
}

export async function saveAnswer(attemptId: string, d: { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number }) {
  const a = await sync(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  const sec = a.test.sections[a.currentSectionIdx];
  if (!sec.questions.some((q) => q.id === d.questionId)) throw new Error("Question not in active section"); // locked sections reject writes
  // timeSpent only grows; guards against client rewinding
  const cur = await prisma.questionResponse.findUnique({ where: { attemptId_questionId: { attemptId, questionId: d.questionId } } });
  await prisma.questionResponse.update({ where: { id: cur!.id }, data: { selectedKey: d.selectedKey, status: d.status, timeSpentMs: Math.max(cur!.timeSpentMs, Math.min(d.timeSpentMs, 6e6)) } });
}

export async function submit(attemptId: string, auto = false) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.testAttempt.findUnique({ where: { id: attemptId }, include: { test: true, responses: { include: { question: { include: { options: true } } } } } });
    if (!a || a.status !== "IN_PROGRESS") return null; // idempotent
    const rows: (ScoreInput & { id: string })[] = a.responses.map((r) => {
      const p = present(r.question as any, a.test.shuffleOptions, a.shuffleSeed);
      return { id: r.id, selectedKey: r.selectedKey, correctKey: p.correctKey, sectionId: r.sectionId, topic: r.topic, difficulty: r.difficulty, timeSpentMs: r.timeSpentMs };
    });
    const t = a.test, s = calculateScore(rows, t.positiveMarks, t.negativeMarks), now = new Date();
    for (const r of rows) {
      const q = a.responses.find((x) => x.id === r.id)!.question; const p = present(q as any, t.shuffleOptions, a.shuffleSeed);
      await tx.questionResponse.update({ where: { id: r.id }, data: { correctKeySnapshot: r.correctKey, isCorrect: r.selectedKey ? r.selectedKey === r.correctKey : null,
        snapshot: { text: q.text, options: p.options, explanation: q.explanation } } });
    }
    const timeTakenSec = Math.min(t.durationSec, Math.round((now.getTime() - a.startedAt.getTime()) / 1000));
    const result = await tx.testResult.create({ data: { attemptId, score: s.score, totalMarks: s.totalMarks, percentage: s.totalMarks ? +((s.score / s.totalMarks) * 100).toFixed(1) : 0,
      accuracy: s.accuracy, attemptRate: s.attemptRate, correct: s.correct, incorrect: s.incorrect, unanswered: s.unanswered, negativeTotal: s.negativeTotal, timeTakenSec,
      sectionStats: groupPerformance(rows, "sectionId", t.positiveMarks, t.negativeMarks), topicStats: groupPerformance(rows, "topic", t.positiveMarks, t.negativeMarks),
      difficultyStats: groupPerformance(rows, "difficulty", t.positiveMarks, t.negativeMarks) } });
    await tx.testAttempt.update({ where: { id: attemptId }, data: { status: auto ? "AUTO_SUBMITTED" : "SUBMITTED", endedAt: now } });
    return result;
  });
}

export async function resultWithComparison(attemptId: string, userId: string) {
  const a = await prisma.testAttempt.findFirst({ where: { id: attemptId, userId }, include: { result: true } });
  if (!a?.result) return null;
  const prev = await prisma.testAttempt.findFirst({ where: { userId, testId: a.testId, attemptNo: { lt: a.attemptNo }, result: { isNot: null } }, orderBy: { attemptNo: "desc" }, include: { result: true } });
  return { attemptNo: a.attemptNo, result: a.result, comparison: compareAttempts(a.result as any, prev?.result as any) };
}
