// Pure helpers shared by the Daily Challenge and Duels (no database).
import { calculateScore } from "./exam/scoring";

export const hash32 = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Deterministic pick: same seed + same pool => same questions, whatever order the pool arrives in. */
export function pickQuestionIds(pool: string[], seed: string, n: number): string[] {
  return [...new Set(pool)].map((id) => ({ id, h: hash32(`${seed}:${id}`) })).sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : 1)).slice(0, n).map((x) => x.id);
}

export interface Answer { questionId: string; selectedKey: string | null; timeMs?: number }
export const NEGATIVE = 0.25;

/** Grade answers against the questions of the quiz. Answers for questions outside the quiz are ignored; duplicates keep the last one. */
export function gradeQuiz(qs: { id: string; correctKey: string }[], answers: Answer[]) {
  const given = new Map<string, Answer>(); for (const a of answers) given.set(a.questionId, a);
  const rows = qs.map((q) => ({ selectedKey: given.get(q.id)?.selectedKey ?? null, correctKey: q.correctKey, sectionId: "q", timeSpentMs: Math.max(0, Math.min(given.get(q.id)?.timeMs ?? 0, 3_600_000)) }));
  const s = calculateScore(rows, 1, NEGATIVE);
  return { ...s, perQuestion: qs.map((q, i) => ({ questionId: q.id, selectedKey: rows[i].selectedKey, correctKey: q.correctKey, isCorrect: rows[i].selectedKey ? rows[i].selectedKey === q.correctKey : null })) };
}

export interface Side { userId: string; score: number; correct: number; timeSec: number }
/** Higher score wins; equal score -> faster wins; both equal -> tie. */
export function duelOutcome(a: Side, b: Side): { winner: string | null; reason: "score" | "time" | "tie" } {
  if (a.score !== b.score) return { winner: a.score > b.score ? a.userId : b.userId, reason: "score" };
  if (a.timeSec !== b.timeSec) return { winner: a.timeSec < b.timeSec ? a.userId : b.userId, reason: "time" };
  return { winner: null, reason: "tie" };
}

export const dailyCoins = (correct: number) => 10 + Math.min(20, correct * 2);
export const DUEL_COINS = { win: 25, lose: 8, tie: 15 };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = (len = 6, rnd: () => number = Math.random) => Array.from({ length: len }, () => ALPHABET[Math.floor(rnd() * ALPHABET.length)]).join("");

/** Seconds left on a timed entry; never negative. */
export const secondsLeft = (startedAt: Date, durationSec: number, now = new Date()) => Math.max(0, durationSec - Math.floor((now.getTime() - startedAt.getTime()) / 1000));
