import { prisma } from "../../lib/db";
import { remaining, effectiveQuestionSec, shuffleOptions } from "./timing";
import { calculateScore, groupPerformance, type ScoreInput } from "./scoring";
import { compareAttempts } from "../analytics/analytics";
import { buildAdaptiveSelection } from "../analytics/adaptive";

type Opt = { key: string; text: string };
type AttemptMode = "EXAM" | "PRACTICE";
type StartOptions = { adaptive?: boolean; questionCount?: number };

export function present(q: { id: string; options: Opt[]; correctKey: string }, shuffle: boolean, seed: number) {
  const base = [...q.options].sort((a, b) => a.key.localeCompare(b.key));
  if (!shuffle) return { options: base, correctKey: q.correctKey };
  let h = seed; for (const c of q.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return shuffleOptions(base, q.correctKey, h);
}

const load = (id: string) => prisma.testAttempt.findUnique({
  where: { id },
  include: {
    test: { include: { sections: { orderBy: { order: "asc" }, include: { questions: { include: { options: true } } } } } },
    sections: true,
  },
});

function selectedIds(a: any): Set<string> | null {
  return Array.isArray(a.adaptiveQuestionIds) ? new Set(a.adaptiveQuestionIds as string[]) : null;
}

function sectionQuestions(a: any, sec: any) {
  const ids = selectedIds(a);
  return ids ? sec.questions.filter((q: any) => ids.has(q.id)) : sec.questions;
}

function nextActiveIndex(a: any, from: number) {
  const ids = selectedIds(a);
  if (!ids) return from + 1 < a.test.sections.length ? from + 1 : -1;
  for (let i = from + 1; i < a.test.sections.length; i++) if (sectionQuestions(a, a.test.sections[i]).length) return i;
  return -1;
}

async function ensureSectionAttempt(attemptId: string, sectionId: string) {
  const existing = await prisma.sectionAttempt.findUnique({ where: { attemptId_sectionId: { attemptId, sectionId } } });
  if (existing) return existing;
  return prisma.sectionAttempt.create({ data: { attemptId, sectionId, startedAt: new Date() } });
}

export async function sync(attemptId: string) {
  let a = await load(attemptId); if (!a) return null;
  if (a.mode === "PRACTICE") return a;
  for (let guard = 0; guard < 100 && a.status === "IN_PROGRESS"; guard++) {
    const sec = a.test.sections[a.currentSectionIdx];
    if (!sec) { await submit(a.id, true); break; }
    const activeQuestions = sectionQuestions(a, sec);
    if (!activeQuestions.length) {
      const nextIdx = nextActiveIndex(a, a.currentSectionIdx);
      if (nextIdx < 0) { await submit(a.id, true); break; }
      await prisma.$transaction([
        prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: nextIdx } }),
        prisma.sectionAttempt.updateMany({ where: { attemptId: a.id, sectionId: sec.id }, data: { locked: true, endedAt: new Date() } }),
      ]);
      await ensureSectionAttempt(a.id, a.test.sections[nextIdx].id);
      a = (await load(attemptId))!;
      continue;
    }
    const sa = a.sections.find((s) => s.sectionId === sec.id) ?? await ensureSectionAttempt(a.id, sec.id);
    const r = remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt, sectionDurationSec: sec.durationSec });
    if (r.testExpired) { await submit(a.id, true); break; }
    if (!r.sectionExpired) break;
    const nextIdx = nextActiveIndex(a, a.currentSectionIdx);
    if (nextIdx < 0) { await submit(a.id, true); break; }
    const next = a.test.sections[nextIdx];
    await prisma.$transaction([
      prisma.sectionAttempt.update({ where: { id: sa.id }, data: { locked: true, endedAt: new Date() } }),
      prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: nextIdx } }),
    ]);
    await ensureSectionAttempt(a.id, next.id);
    a = (await load(attemptId))!;
  }
  return load(attemptId);
}

export async function start(userId: string, testId: string, mode: AttemptMode = "EXAM", options: StartOptions = {}) {
  const open = await prisma.testAttempt.findMany({ where: { userId, testId, status: "IN_PROGRESS", mode }, orderBy: { startedAt: "desc" }, take: 5 });
  const resume = open.find((a: any) => options.adaptive ? !!a.adaptiveQuestionIds : !a.adaptiveQuestionIds);
  if (resume) return (await sync(resume.id))!;

  const test = await prisma.test.findUnique({ where: { id: testId }, include: { sections: { orderBy: { order: "asc" }, include: { questions: true } } } });
  if (!test?.published || !test.sections.length) throw new Error("Test not available");
  if (mode === "PRACTICE" && !test.allowPracticeMode) throw new Error("Practice mode is disabled for this test");

  const previous = await prisma.testAttempt.count({ where: { userId, testId, mode: "EXAM" } });
  if (mode === "EXAM" && test.maxAttempts && previous >= test.maxAttempts) throw new Error(`Maximum attempts reached (${test.maxAttempts}).`);
  const allAttempts = await prisma.testAttempt.count({ where: { userId, testId } });
  const shuffleSeed = Math.floor(Math.random() * 2 ** 31);

  let adaptiveQuestionIds: string[] | null = null;
  let adaptivePlan: any = null;
  if (mode === "PRACTICE" && options.adaptive) {
    const candidates = test.sections.flatMap((s) => s.questions.map((q) => ({ id: q.id, sectionId: s.id, topic: q.topic, difficulty: q.difficulty })));
    const history = await prisma.questionResponse.findMany({
      where: { attempt: { userId, mode: "EXAM", result: { isNot: null } }, topic: { not: null } },
      select: { topic: true, isCorrect: true, timeSpentMs: true },
      take: 5000,
      orderBy: { updatedAt: "desc" },
    });
    const selection = buildAdaptiveSelection(candidates, history, Math.min(Math.max(options.questionCount ?? 20, 5), 50), shuffleSeed);
    adaptiveQuestionIds = selection.questionIds;
    adaptivePlan = selection;
  }

  const chosen = adaptiveQuestionIds ? new Set(adaptiveQuestionIds) : null;
  const activeSection = test.sections.find((s) => s.questions.some((q) => !chosen || chosen.has(q.id))) ?? test.sections[0];
  const activeSectionIdx = test.sections.findIndex((s) => s.id === activeSection.id);
  const responseQuestions = test.sections.flatMap((s) => s.questions.filter((q) => !chosen || chosen.has(q.id)).map((q) => ({
    questionId: q.id, sectionId: s.id, topic: q.topic, difficulty: q.difficulty,
  })));
  if (!responseQuestions.length) throw new Error("This test does not have enough questions for an adaptive session.");

  const a = await prisma.testAttempt.create({
    data: {
      userId, testId, attemptNo: allAttempts + 1, mode, shuffleSeed,
      adaptiveQuestionIds: adaptiveQuestionIds ?? undefined,
      currentSectionIdx: activeSectionIdx < 0 ? 0 : activeSectionIdx,
      sections: { create: { sectionId: activeSection.id, startedAt: new Date() } },
      responses: { create: responseQuestions },
    },
  });
  // Keep the plan handy for server diagnostics; the client only receives a safe summary.
  void adaptivePlan;
  return (await sync(a.id))!;
}

export async function view(attemptId: string) {
  const a = await sync(attemptId); if (!a) return null;
  const sec = a.test.sections[a.currentSectionIdx];
  if (!sec) return null;
  const sa = a.sections.find((s) => s.sectionId === sec.id)!;
  const responses = await prisma.questionResponse.findMany({ where: { attemptId } });
  const visibleQuestions = sectionQuestions(a, sec);
  const ordered = a.test.shuffleQuestions ? orderedQuestions(visibleQuestions, a.shuffleSeed ^ a.currentSectionIdx) : visibleQuestions;
  const questions = ordered.map((q) => {
    const r = responses.find((x) => x.questionId === q.id)!;
    const p = present(q as any, a.test.shuffleOptions, a.shuffleSeed);
    return {
      id: q.id, text: q.text, options: p.options,
      timeLimitSec: a.mode === "PRACTICE" ? null : effectiveQuestionSec(q.timeLimitSec, sec.questionSec, a.test.globalQuestionSec),
      selectedKey: r.selectedKey, status: r.status, timeSpentMs: r.timeSpentMs,
    };
  });
  const timed = a.mode === "EXAM";
  const adaptive = !!a.adaptiveQuestionIds;
  const adaptiveTopics = adaptive ? [...new Set(a.test.sections.flatMap((s: any) => sectionQuestions(a, s).map((q: any) => q.topic).filter(Boolean)))] : [];
  return {
    id: a.id, status: a.status, mode: a.mode, adaptive, adaptiveTopics, serverNow: Date.now(), sectionIdx: a.currentSectionIdx, sectionCount: a.test.sections.length, sectionName: sec.name,
    remaining: timed ? remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt }) : { test: -1, section: -1, question: null, testExpired: false, sectionExpired: false, questionExpired: false },
    questions,
    rules: { negative: a.test.negativeMarks, maxTabSwitches: a.test.maxTabSwitches, fullscreen: timed && a.test.requireFullscreen },
    test: { name: a.test.name, examName: a.test.examName, passingPercent: a.test.passingPercent, showResult: a.test.showResult, leaderboard: a.test.leaderboard, allowSectionBacktrack: a.test.allowSectionBacktrack, allowSectionSwitch: a.test.allowSectionSwitch },
  };
}

function orderedQuestions<T>(items: T[], seed: number) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const arr = [...items]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr;
}

export async function saveAnswer(attemptId: string, d: { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number }) {
  const a = await sync(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  const sec = a.test.sections[a.currentSectionIdx];
  if (!sec || !sectionQuestions(a, sec).some((q: any) => q.id === d.questionId)) throw new Error("Question not in active section");
  const cur = await prisma.questionResponse.findUnique({ where: { attemptId_questionId: { attemptId, questionId: d.questionId } } });
  if (!cur) throw new Error("Response not found");
  await prisma.questionResponse.update({ where: { id: cur.id }, data: { selectedKey: d.selectedKey, status: d.status, timeSpentMs: Math.max(cur.timeSpentMs, Math.min(d.timeSpentMs, 6e6)) } });
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
  return { attemptNo: a.attemptNo, mode: a.mode, adaptive: !!a.adaptiveQuestionIds, testId: a.testId, passingPercent: a.test.passingPercent, showResult: a.test.showResult, result: a.result, comparison: a.mode === "EXAM" ? compareAttempts(a.result as any, prev?.result as any) : null };
}
