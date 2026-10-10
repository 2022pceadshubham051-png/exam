import { prisma } from "../../lib/db";
import { remaining, effectiveQuestionSec, shuffleOptions } from "./timing";
import { calculateScore, groupPerformance, type ScoreInput } from "./scoring";
import { compareAttempts } from "../analytics/analytics";
import { buildAdaptiveSelection } from "../analytics/adaptive";
import { detect, normalizeSubject, SUBJECT_NAMES } from "../syllabus/classifier";

type Opt = { key: string; text: string };
type AttemptMode = "EXAM" | "PRACTICE";
type StartOptions = { adaptive?: boolean; questionCount?: number; topics?: string[] };
const TX = { timeout: 60_000, maxWait: 15_000 };

/** Subject + topic for a question: admin-provided values win, everything else is auto-detected. */
export function tagQuestion(q: { text: string; subject?: string | null; topic?: string | null }) {
  const d = detect(q.text, { subject: q.subject, topic: q.topic });
  const subject = normalizeSubject(q.subject) ?? d.subject;
  return { subject: subject as string, topic: (q.topic?.trim() || d.topic) as string, confidence: d.confidence };
}

export function present(q: { id: string; options: Opt[]; correctKey: string }, shuffle: boolean, seed: number) {
  const base = [...q.options].sort((a, b) => a.key.localeCompare(b.key));
  if (!shuffle) return { options: base, correctKey: q.correctKey };
  let h = seed; for (const c of q.id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return shuffleOptions(base, q.correctKey, h);
}

const load = (id: string) => prisma.testAttempt.findUnique({
  where: { id },
  include: {
    test: { include: { sections: { orderBy: { order: "asc" }, include: { questions: { include: { options: true }, orderBy: { createdAt: "asc" } } } } } },
    sections: true,
  },
});

function selectedIds(a: any): Set<string> | null { return Array.isArray(a.adaptiveQuestionIds) ? new Set(a.adaptiveQuestionIds as string[]) : null; }
function sectionQuestions(a: any, sec: any) { const ids = selectedIds(a); return ids ? sec.questions.filter((q: any) => ids.has(q.id)) : sec.questions; }

/** Questions the student can currently see/answer. Practice = every section at once; Exam = the live section. */
function activeQuestions(a: any): { q: any; sec: any; secIdx: number }[] {
  if (a.mode === "PRACTICE") return a.test.sections.flatMap((sec: any, secIdx: number) => sectionQuestions(a, sec).map((q: any) => ({ q, sec, secIdx })));
  const sec = a.test.sections[a.currentSectionIdx];
  return sec ? sectionQuestions(a, sec).map((q: any) => ({ q, sec, secIdx: a.currentSectionIdx })) : [];
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
    const active = sectionQuestions(a, sec);
    if (!active.length) {
      const nextIdx = nextActiveIndex(a, a.currentSectionIdx);
      if (nextIdx < 0) { await submit(a.id, true); break; }
      await prisma.$transaction([
        prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: nextIdx } }),
        prisma.sectionAttempt.updateMany({ where: { attemptId: a.id, sectionId: sec.id }, data: { locked: true, endedAt: new Date() } }),
      ]);
      await ensureSectionAttempt(a.id, a.test.sections[nextIdx].id);
      a = (await load(attemptId))!; continue;
    }
    const sa = a.sections.find((s) => s.sectionId === sec.id) ?? await ensureSectionAttempt(a.id, sec.id);
    const r = remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt, sectionDurationSec: sec.durationSec });
    if (r.testExpired) { await submit(a.id, true); break; }
    if (!r.sectionExpired) break;
    const nextIdx = nextActiveIndex(a, a.currentSectionIdx);
    if (nextIdx < 0) { await submit(a.id, true); break; }
    await prisma.$transaction([
      prisma.sectionAttempt.update({ where: { id: sa.id }, data: { locked: true, endedAt: new Date() } }),
      prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: nextIdx } }),
    ]);
    await ensureSectionAttempt(a.id, a.test.sections[nextIdx].id);
    a = (await load(attemptId))!;
  }
  return load(attemptId);
}

/** Move an EXAM attempt forward to the next section before the section timer ends. */
export async function nextSection(attemptId: string) {
  const a = await sync(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  if (a.mode !== "EXAM") throw new Error("Sections are only used in Exam mode");
  const sec = a.test.sections[a.currentSectionIdx];
  const nextIdx = nextActiveIndex(a, a.currentSectionIdx);
  if (nextIdx < 0) return { last: true };
  await prisma.$transaction([
    prisma.sectionAttempt.updateMany({ where: { attemptId: a.id, sectionId: sec.id }, data: { locked: true, endedAt: new Date() } }),
    prisma.testAttempt.update({ where: { id: a.id }, data: { currentSectionIdx: nextIdx } }),
  ]);
  await ensureSectionAttempt(a.id, a.test.sections[nextIdx].id);
  return { last: false };
}

export async function start(userId: string, testId: string, mode: AttemptMode = "EXAM", options: StartOptions = {}) {
  const wantsAdaptive = mode === "PRACTICE" && (!!options.adaptive || !!options.topics?.length);
  const open = await prisma.testAttempt.findMany({ where: { userId, testId, status: "IN_PROGRESS", mode }, orderBy: { startedAt: "desc" }, take: 5 });
  const resume = open.find((a: any) => wantsAdaptive ? !!a.adaptiveQuestionIds : !a.adaptiveQuestionIds);
  if (resume) return (await sync(resume.id))!;

  const test = await prisma.test.findUnique({ where: { id: testId }, include: { sections: { orderBy: { order: "asc" }, include: { questions: { orderBy: { createdAt: "asc" } } } } } });
  if (!test?.published || !test.sections.length) throw new Error("Test not available");
  if (mode === "PRACTICE" && !test.allowPracticeMode) throw new Error("Practice mode is disabled for this test");

  const previous = await prisma.testAttempt.count({ where: { userId, testId, mode: "EXAM" } });
  if (mode === "EXAM" && test.maxAttempts && previous >= test.maxAttempts) throw new Error(`Maximum attempts reached (${test.maxAttempts}).`);
  // max()+1 (not count()+1) so deleting an old attempt can never collide with an existing attempt number.
  const last = await prisma.testAttempt.aggregate({ where: { userId, testId }, _max: { attemptNo: true } });
  const attemptNo = (last._max.attemptNo ?? 0) + 1;
  const shuffleSeed = Math.floor(Math.random() * 2 ** 31);

  const tags = new Map<string, { subject: string; topic: string }>();
  for (const s of test.sections) for (const q of s.questions) tags.set(q.id, tagQuestion(q));

  let adaptiveQuestionIds: string[] | null = null;
  if (wantsAdaptive) {
    let candidates = test.sections.flatMap((s) => s.questions.map((q) => ({ id: q.id, sectionId: s.id, topic: tags.get(q.id)!.topic, difficulty: q.difficulty })));
    if (options.topics?.length) {
      const want = options.topics.map((t) => t.toLowerCase());
      candidates = candidates.filter((c) => { const t = tags.get(c.id)!; return want.includes(c.topic.toLowerCase()) || want.includes(t.subject.toLowerCase()) || want.includes((SUBJECT_NAMES as any)[t.subject]?.toLowerCase()); });
      if (!candidates.length) throw new Error("This test has no questions on the selected topic. Try another test.");
    }
    const history = await prisma.questionResponse.findMany({
      where: { attempt: { userId, mode: "EXAM", result: { isNot: null } }, topic: { not: null } },
      select: { topic: true, isCorrect: true, timeSpentMs: true }, take: 5000, orderBy: { updatedAt: "desc" },
    });
    adaptiveQuestionIds = buildAdaptiveSelection(candidates, history, Math.min(Math.max(options.questionCount ?? 20, 5), 50), shuffleSeed).questionIds;
  }

  const chosen = adaptiveQuestionIds ? new Set(adaptiveQuestionIds) : null;
  const activeSection = test.sections.find((s) => s.questions.some((q) => !chosen || chosen.has(q.id))) ?? test.sections[0];
  const activeSectionIdx = test.sections.findIndex((s) => s.id === activeSection.id);
  let ord = 0;
  const responseQuestions = test.sections.flatMap((s) => s.questions.filter((q) => !chosen || chosen.has(q.id)).map((q) => ({
    questionId: q.id, sectionId: s.id, subject: tags.get(q.id)!.subject, topic: tags.get(q.id)!.topic, difficulty: q.difficulty, ord: ord++,
  })));
  if (!responseQuestions.length) throw new Error("This test does not have enough questions for this session.");

  const a = await prisma.testAttempt.create({
    data: {
      userId, testId, attemptNo, mode, shuffleSeed,
      adaptiveQuestionIds: adaptiveQuestionIds ?? undefined,
      currentSectionIdx: mode === "PRACTICE" ? 0 : activeSectionIdx < 0 ? 0 : activeSectionIdx,
      sections: { create: { sectionId: mode === "PRACTICE" ? test.sections[0].id : activeSection.id, startedAt: new Date() } },
      responses: { create: responseQuestions },
    },
  });
  return (await sync(a.id))!;
}

export async function view(attemptId: string) {
  const a = await sync(attemptId); if (!a) return null;
  const practice = a.mode === "PRACTICE";
  const sec = a.test.sections[a.currentSectionIdx] ?? a.test.sections[0];
  if (!sec) return null;
  const sa = a.sections.find((s) => s.sectionId === sec.id);
  const responses = await prisma.questionResponse.findMany({ where: { attemptId } });
  const rmap = new Map<string, any>(responses.map((r: any) => [r.questionId, r] as [string, any]));

  let list = activeQuestions(a);
  if (a.test.shuffleQuestions && !practice) {
    const order = orderedQuestions(list.map((x) => x.q.id), a.shuffleSeed ^ a.currentSectionIdx);
    const pos = new Map(order.map((id, i) => [id, i])); list = [...list].sort((x, y) => pos.get(x.q.id)! - pos.get(y.q.id)!);
  } else if (a.test.shuffleQuestions && practice) {
    // keep sections grouped, shuffle inside each one
    const out: typeof list = [];
    for (let i = 0; i < a.test.sections.length; i++) {
      const grp = list.filter((x) => x.secIdx === i); const order = orderedQuestions(grp.map((x) => x.q.id), a.shuffleSeed ^ i);
      const pos = new Map(order.map((id, j) => [id, j])); out.push(...grp.sort((x, y) => pos.get(x.q.id)! - pos.get(y.q.id)!));
    }
    list = out;
  }
  const questions = list.map(({ q, sec: s }) => {
    const r = rmap.get(q.id)!; const p = present(q as any, a.test.shuffleOptions, a.shuffleSeed);
    const tag = tagQuestion(q);
    return { id: q.id, text: q.text, options: p.options, section: s.name, subject: r.subject ?? tag.subject, topic: r.topic ?? tag.topic,
      timeLimitSec: practice ? null : effectiveQuestionSec(q.timeLimitSec, s.questionSec, a.test.globalQuestionSec),
      selectedKey: r.selectedKey, status: r.status, timeSpentMs: r.timeSpentMs };
  });
  const adaptive = !!a.adaptiveQuestionIds;
  const adaptiveTopics = adaptive ? [...new Set(questions.map((q) => q.topic).filter(Boolean))] : [];
  return {
    id: a.id, status: a.status, mode: a.mode, adaptive, adaptiveTopics, serverNow: Date.now(), sectionIdx: practice ? 0 : a.currentSectionIdx,
    sectionCount: a.test.sections.length, sectionName: practice ? "All sections" : sec.name,
    isLastSection: practice ? true : nextActiveIndex(a, a.currentSectionIdx) < 0,
    remaining: !practice && sa ? remaining({ attemptStart: a.startedAt, testDurationSec: a.test.durationSec, sectionStart: sa.startedAt, sectionDurationSec: sec.durationSec }) : { test: -1, section: -1, question: null, testExpired: false, sectionExpired: false, questionExpired: false },
    questions,
    rules: { negative: a.test.negativeMarks, positive: a.test.positiveMarks, maxTabSwitches: a.test.maxTabSwitches, fullscreen: !practice && a.test.requireFullscreen },
    test: { id: a.testId, name: a.test.name, examName: a.test.examName, passingPercent: a.test.passingPercent, showResult: a.test.showResult, leaderboard: a.test.leaderboard, allowSectionBacktrack: a.test.allowSectionBacktrack, allowSectionSwitch: a.test.allowSectionSwitch },
  };
}

function orderedIds(ids: string[], seed: number) { return orderedQuestions(ids, seed); }
export function orderedQuestions<T>(items: T[], seed: number) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const arr = [...items]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr;
}
void orderedIds;

export async function saveAnswer(attemptId: string, d: { questionId: string; selectedKey: string | null; status: string; timeSpentMs: number }) {
  const a = await sync(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  if (!activeQuestions(a).some((x) => x.q.id === d.questionId)) throw new Error("Question not in active section");
  const cur = await prisma.questionResponse.findUnique({ where: { attemptId_questionId: { attemptId, questionId: d.questionId } } });
  if (!cur) throw new Error("Response not found");
  await prisma.questionResponse.update({ where: { id: cur.id }, data: { selectedKey: d.selectedKey, status: d.status, timeSpentMs: Math.max(cur.timeSpentMs, Math.min(d.timeSpentMs, 6e6)) } });
}

/** Practice mode only: instant feedback (correct option + explanation) for one question. */
export async function checkAnswer(attemptId: string, questionId: string) {
  const a = await load(attemptId); if (!a || a.status !== "IN_PROGRESS") throw new Error("Attempt closed");
  if (a.mode !== "PRACTICE") throw new Error("Instant answers are only available in Practice mode");
  const hit = activeQuestions(a).find((x) => x.q.id === questionId); if (!hit) throw new Error("Question not in this session");
  const p = present(hit.q, a.test.shuffleOptions, a.shuffleSeed);
  const r = await prisma.questionResponse.findUnique({ where: { attemptId_questionId: { attemptId, questionId } } });
  return { correctKey: p.correctKey, explanation: hit.q.explanation ?? null, isCorrect: r?.selectedKey ? r.selectedKey === p.correctKey : null };
}

async function chunked<T>(items: T[], size: number, fn: (x: T) => Promise<unknown>) { for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn)); }

export async function submit(attemptId: string, auto = false) {
  try {
    return await prisma.$transaction(async (tx) => {
      const a = await tx.testAttempt.findUnique({ where: { id: attemptId }, include: { test: { include: { sections: { select: { id: true, name: true } } } }, responses: { include: { question: { include: { options: true } } } } } });
      if (!a || a.status !== "IN_PROGRESS") return null;
      const t = a.test;
      const rows: (ScoreInput & { id: string })[] = a.responses.map((r) => {
        const p = present(r.question as any, t.shuffleOptions, a.shuffleSeed); const tag = tagQuestion(r.question);
        return { id: r.id, selectedKey: r.selectedKey, correctKey: p.correctKey, sectionId: r.sectionId, subject: r.subject ?? tag.subject, topic: r.topic ?? tag.topic, difficulty: r.difficulty, timeSpentMs: r.timeSpentMs };
      });
      const s = calculateScore(rows, t.positiveMarks, t.negativeMarks), now = new Date();
      const byId = new Map<string, any>(a.responses.map((r: any) => [r.id, r] as [string, any]));
      await chunked(rows, 20, (r) => {
        const q = byId.get(r.id)!.question; const p = present(q as any, t.shuffleOptions, a.shuffleSeed);
        return tx.questionResponse.update({ where: { id: r.id }, data: { correctKeySnapshot: r.correctKey, subject: r.subject, topic: r.topic, isCorrect: r.selectedKey ? r.selectedKey === r.correctKey : null, snapshot: { text: q.text, options: p.options, explanation: q.explanation } } });
      });
      const elapsed = Math.max(0, Math.round((now.getTime() - a.startedAt.getTime()) / 1000));
      const timeTakenSec = a.mode === "PRACTICE" ? elapsed : Math.min(t.durationSec, elapsed);
      const named = (g: Record<string, any>, names: Map<string, string>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { ...v, name: names.get(k) ?? k }]));
      const secNames = new Map<string, string>(t.sections.map((x: any) => [x.id, x.name] as [string, string]));
      const subjNames = new Map<string, string>(Object.entries(SUBJECT_NAMES));
      const result = await tx.testResult.create({ data: { attemptId, score: s.score, totalMarks: s.totalMarks, percentage: s.totalMarks ? +((s.score / s.totalMarks) * 100).toFixed(1) : 0,
        accuracy: s.accuracy, attemptRate: s.attemptRate, correct: s.correct, incorrect: s.incorrect, unanswered: s.unanswered, negativeTotal: s.negativeTotal, timeTakenSec,
        sectionStats: named(groupPerformance(rows, "sectionId", t.positiveMarks, t.negativeMarks), secNames), topicStats: groupPerformance(rows, "topic", t.positiveMarks, t.negativeMarks),
        difficultyStats: groupPerformance(rows, "difficulty", t.positiveMarks, t.negativeMarks),
        subjectStats: named(groupPerformance(rows, "subject", t.positiveMarks, t.negativeMarks), subjNames) } });
      await tx.testAttempt.update({ where: { id: attemptId }, data: { status: auto ? "AUTO_SUBMITTED" : "SUBMITTED", endedAt: now } });
      return result;
    }, TX);
  } catch (e: any) { if (e?.code === "P2002") return null; throw e; } // concurrent submit already created the result
}

export async function resultWithComparison(attemptId: string, userId: string) {
  const a = await prisma.testAttempt.findFirst({ where: { id: attemptId, userId }, include: { result: true, test: { select: { passingPercent: true, showResult: true, name: true, negativeMarks: true } } } });
  if (!a?.result) return null;
  // "Show result" off: the server must not hand the numbers over either (hiding them in the UI alone is not enough).
  if (a.mode === "EXAM" && a.test.showResult === false) {
    return { attemptNo: a.attemptNo, mode: a.mode, adaptive: false, testId: a.testId, testName: a.test.name, passingPercent: a.test.passingPercent, showResult: false, result: null, rank: null, percentile: null, field: 0, comparison: null };
  }
  const prev = await prisma.testAttempt.findFirst({ where: { userId, testId: a.testId, mode: "EXAM", attemptNo: { lt: a.attemptNo }, result: { isNot: null } }, orderBy: { attemptNo: "desc" }, include: { result: true } });
  let rank: number | null = null, percentile: number | null = null, field = 0;
  if (a.mode === "EXAM") {
    const where = { attempt: { testId: a.testId, mode: "EXAM" as const } };
    const [above, below, total] = await Promise.all([prisma.testResult.count({ where: { ...where, score: { gt: a.result.score } } }), prisma.testResult.count({ where: { ...where, score: { lt: a.result.score } } }), prisma.testResult.count({ where })]);
    field = total; rank = above + 1; percentile = total > 1 ? +((below / (total - 1)) * 100).toFixed(1) : null;
  }
  return { attemptNo: a.attemptNo, mode: a.mode, adaptive: !!a.adaptiveQuestionIds, testId: a.testId, testName: a.test.name, passingPercent: a.test.passingPercent, showResult: a.test.showResult, result: a.result, rank, percentile, field,
    comparison: a.mode === "EXAM" ? compareAttempts(a.result as any, prev?.result as any) : null };
}

/** Delete attempts owned by `userId`. Official attempts of tests with an attempt limit are protected so limits cannot be bypassed. */
export async function deleteAttempts(userId: string, where: { ids?: string[]; testId?: string; mode?: AttemptMode; all?: boolean }) {
  const attempts = await prisma.testAttempt.findMany({
    where: { userId, ...(where.ids ? { id: { in: where.ids } } : {}), ...(where.testId ? { testId: where.testId } : {}), ...(where.mode ? { mode: where.mode } : {}) },
    select: { id: true, mode: true, test: { select: { name: true, maxAttempts: true } } },
  });
  if (!where.ids && !where.testId && !where.mode && !where.all) throw new Error("Nothing to delete");
  const protectedOnes = attempts.filter((x) => x.mode === "EXAM" && x.test.maxAttempts);
  const deletable = attempts.filter((x) => !protectedOnes.includes(x));
  if (!deletable.length) throw new Error(protectedOnes.length ? `This test has an attempt limit, so official attempts cannot be deleted. Ask your admin to reset attempts.` : "Attempt not found");
  const ids = deletable.map((x) => x.id);
  await prisma.$transaction(async (tx) => { await tx.testResult.deleteMany({ where: { attemptId: { in: ids } } }); await tx.testAttempt.deleteMany({ where: { id: { in: ids } } }); }, TX);
  return { deleted: ids.length, skipped: protectedOnes.length };
}
