import { prisma } from "../../lib/db";
import { remaining, effectiveQuestionSec, shuffleOptions } from "./timing";
import { calculateScore, groupPerformance, type ScoreInput } from "./scoring";
import { compareAttempts } from "../analytics/analytics";

type Opt = { key: string; text: string };
type AttemptMode = "EXAM" | "PRACTICE";

export function present(q: { id: string; options: Opt[]; correctKey: string }, shuffle: boolean, seed: number) {
  const base = [...q.options].sort((a, b) => a.key.localeCompare(b.key));
  if (!shuffle) return { options: base, correctKey: q.correctKey };
  let h = seed; for (const c of q.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return shuffleOptions(base, q.correctKey, h);
}

const load = (id: string) => prisma.testAttempt.findUnique({ where: { id }, include: { test: { include: { sections: { orderBy: { order: "asc" }, include: { questions: { include: { options: true } } } } } }, sections: true } });

function orderedQuestions<T>(items: T[], seed: number) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const arr = [...items]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr;
}

export async function sync(attemptId: string) {
  let a = await load(attemptId); if (!a) return null;
  if (a.mode === "PRACTICE") return a;
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

export async function start(userId: string, testId: string, mode: AttemptMode = "EXAM") {
  const open = await prisma.testAttempt.findFirst({ where: { userId, testId, status: "IN_PROGRESS" }, orderBy: { startedAt: "desc" } });
  if (open) return (await sync(open.id))!;
  const test = await prisma.test.findUnique({ where: { id: testId }, include: { sections: { orderBy: { order: "asc" }, include: { questions: true } } } });
  if (!test?.published || !test.sections.length) throw new Error("Test not available");
  if (mode === "PRACTICE" && !test.allowPracticeMode) throw new Error("Practice mode is disabled for this test");
  const previous = await prisma.testAttempt.count({ where: { userId, testId, mode: "EXAM" } });
  if (mode === "EXAM" && test.maxAttempts && previous >= test.maxAttempts) throw new Error(`Maximum attempts reached (${test.maxAttempts}).`);
  const allAttempts = await prisma.testAttempt.count({ where: { userId, testId } });
  const a = await prisma.testAttempt.create({ data: { userId, testId, attemptNo: allAttempts + 1, mode, shuffleSeed: Math.floor(Math.random() * 2 ** 31),
    sections: { create: { sectionId: test.sections[0].id, startedAt: new Date() } },
    responses: { create: test.sections.flatMap((s) => s.questions.map((q) => ({ questionId: q.id, sectionId: s.id, topic: q.topic, difficulty: q.difficulty }))) } } });
  return (await sync(a.id))!;
}

export async function view(attemptId: string) {
  const a = await sync(attemptId); if (!a) return null;
  const sec = a.test.sections[a.currentSectionIdx]; const sa = a.sections.find((s) => s.sectionId === sec.id)!;
  const responses = await prisma.questionResponse.findMany({ where: { attemptId } });
  const ordered = a.test.shuffleQuestions ? orderedQuestions(sec.questions, a.shuffleSeed ^ a.currentSectionIdx) : sec.questions;
  const questions = ordered.map((q) => {
    const r = responses.find((x) => x.questionId === q.id)!;
    const p = present(q as any, a.test.shuffleOptions, a.shuffleSeed);
    return { id: q.id, text: q.text, options: p.options, timeLimitSec: a.mode === "PRACTICE" ? null : effectiveQuestionSec(q.timeLimitSec, sec.questionSec, a.test.globalQuestionSec),
      selectedKey: r.selectedKey, status: r.status, timeSpentMs: r.timeSpentMs };
  });
  const timed = a.mode === "EXAM";
  return { id: a.id, status: a.status, mode: a.mode, serverNow: Date.now(), sectionIdx: a.currentSectionIdx, sectionCount: a.test.sections.length, sectionName: sec.name,
    remaining: timed ? remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt }) : { test: -1, section: -1, question: null, testExpired: false, sectionExpired: false, questionExpired: false },
    questions, rules: { negative: a.test.negativeMarks, maxTabSwitches: a.test.maxTabSwitches, fullscreen: timed && a.test.requireFullscreen },
    test: { name: a.test.name, examName: a.test.examName, passingPercent: a.test.passingPercent, showResult: a.test.showResult, allowSectionBacktrack: a.test.allowSectionBacktrack, allowSectionSwitch: a.test.allowSectionSwitch } };
}

export async function saveAnswer(attemptId: string, d: { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number }) {
  const a = await sync(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  const sec = a.test.sections[a.currentSectionIdx];
  if (!sec.questions.some((q) => q.id === d.questionId)) throw new Error("Question not in active section");
  const cur = await prisma.questionResponse.findUnique({ where: { attemptId_questionId: { attemptId, questionId: d.questionId } } });
  await prisma.questionResponse.update({ where: { id: cur!.id }, data: { selectedKey: d.selectedKey, status: d.status, timeSpentMs: Math.max(cur!.timeSpentMs, Math.min(d.timeSpentMs, 6e6)) } });
}

export async function submit(attemptId: string, auto = false) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.testAttempt.findUnique({ where: { id: attemptId }, include: { test: true, responses: { include: { question: { include: { options: true } } } } } });
    if (!a || a.status !== "IN_PROGRESS") return null;
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
    const elapsed = Math.max(0, Math.round((now.getTime() - a.startedAt.getTime()) / 1000));
    const timeTakenSec = a.mode === "PRACTICE" ? elapsed : Math.min(t.durationSec, elapsed);
    const result = await tx.testResult.create({ data: { attemptId, score: s.score, totalMarks: s.totalMarks, percentage: s.totalMarks ? +((s.score / s.totalMarks) * 100).toFixed(1) : 0,
      accuracy: s.accuracy, attemptRate: s.attemptRate, correct: s.correct, incorrect: s.incorrect, unanswered: s.unanswered, negativeTotal: s.negativeTotal, timeTakenSec,
      sectionStats: groupPerformance(rows, "sectionId", t.positiveMarks, t.negativeMarks), topicStats: groupPerformance(rows, "topic", t.positiveMarks, t.negativeMarks),
      difficultyStats: groupPerformance(rows, "difficulty", t.positiveMarks, t.negativeMarks) } });
    await tx.testAttempt.update({ where: { id: attemptId }, data: { status: auto ? "AUTO_SUBMITTED" : "SUBMITTED", endedAt: now } });
    return result;
  });
}

export async function resultWithComparison(attemptId: string, userId: string) {
  const a = await prisma.testAttempt.findFirst({ where: { id: attemptId, userId }, include: { result: true, test: { select: { passingPercent: true, showResult: true } } } });
  if (!a?.result) return null;
  const prev = await prisma.testAttempt.findFirst({ where: { userId, testId: a.testId, mode: "EXAM", attemptNo: { lt: a.attemptNo }, result: { isNot: null } }, orderBy: { attemptNo: "desc" }, include: { result: true } });
  return { attemptNo: a.attemptNo, mode: a.mode, testId: a.testId, passingPercent: a.test.passingPercent, showResult: a.test.showResult, result: a.result, comparison: a.mode === "EXAM" ? compareAttempts(a.result as any, prev?.result as any) : null };
}
