import type { Blueprint } from "../syllabus/blueprints";
import { SUBJECT_NAMES, type SubjectKey } from "../syllabus/classifier";

export interface RespRow { subject: SubjectKey; topic: string; correct: boolean; timeSec: number; ageDays: number; difficulty?: string | null }
export interface Score100 { score: number; accuracy: number; avgSec: number; questions: number; confidence: "low" | "medium" | "high"; trend: number | null; level: "Strong" | "Good" | "Average" | "Weak" | "Critical" }

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const levelOf = (s: number): Score100["level"] => (s >= 80 ? "Strong" : s >= 65 ? "Good" : s >= 50 ? "Average" : s >= 35 ? "Weak" : "Critical");

/** Rating out of 100 for a group of responses: recency-weighted + prior-smoothed accuracy (75%), speed (15%), trend (10%). */
export function rate(rows: RespRow[], targetSec = 45): Score100 | null {
  if (!rows.length) return null;
  const HALF_LIFE = 25; // days
  let w = 0, wc = 0, ws = 0;
  for (const r of rows) { const k = Math.pow(0.5, Math.max(0, r.ageDays) / HALF_LIFE); w += k; if (r.correct) wc += k; ws += k * Math.max(0, r.timeSec); }
  const PRIOR = 3; // pseudo-questions at 50% so 2/2 correct does not read as mastery
  const acc = (wc + PRIOR * 0.5) / (w + PRIOR);
  const rawAcc = rows.filter((r) => r.correct).length / rows.length;
  const avgSec = ws / w, ratio = avgSec / Math.max(10, targetSec);
  const speed = ratio <= 1 ? 1 : clamp(1 - (ratio - 1) / 1.5);
  const sorted = [...rows].sort((a, b) => b.ageDays - a.ageDays); // oldest first
  let trend: number | null = null;
  if (rows.length >= 10) {
    const h = Math.floor(sorted.length / 2), a = sorted.slice(0, h), b = sorted.slice(h);
    trend = +(((b.filter((r) => r.correct).length / b.length) - (a.filter((r) => r.correct).length / a.length)) * 100).toFixed(1);
  }
  const trendScore = trend === null ? 0.5 : clamp(0.5 + trend / 100);
  const score = Math.round(100 * (0.75 * acc + 0.15 * speed + 0.1 * trendScore));
  const confidence = rows.length >= 30 ? "high" : rows.length >= 10 ? "medium" : "low";
  return { score, accuracy: +(rawAcc * 100).toFixed(1), avgSec: +avgSec.toFixed(1), questions: rows.length, confidence, trend, level: levelOf(score) };
}

export function groupBy<T>(xs: T[], key: (x: T) => string) { const m = new Map<string, T[]>(); for (const x of xs) { const k = key(x); (m.get(k) ?? m.set(k, []).get(k)!).push(x); } return m; }

export function analyse(rows: RespRow[], bp: Blueprint, targetScore = 80) {
  const spq = (bp.durationMin * 60) / Math.max(1, bp.subjects.reduce((a, s) => a + s.questions, 0));
  const totalMarks = bp.subjects.reduce((a, s) => a + s.marks, 0);
  const bySubj = groupBy(rows, (r) => r.subject);

  const subjects = bp.subjects.map((s) => {
    const r = rate(bySubj.get(s.key) ?? [], spq);
    const weight = +((s.marks / totalMarks) * 100).toFixed(1);
    const topics = [...groupBy(bySubj.get(s.key) ?? [], (x) => x.topic).entries()].map(([topic, xs]) => ({ topic, ...rate(xs, spq)! })).sort((a, b) => a.score - b.score);
    // marks at stake: how many marks of this exam are still being lost here
    const marksAtStake = +(((100 - (r?.score ?? 0)) / 100) * s.marks).toFixed(1);
    return { key: s.key, name: s.name, questions: s.questions, marks: s.marks, weight, rating: r, topics, marksAtStake };
  });

  const extra = [...bySubj.keys()].filter((k) => !bp.subjects.some((s) => s.key === k)).map((k) => ({ key: k, name: SUBJECT_NAMES[k as SubjectKey] ?? k, rating: rate(bySubj.get(k)!, spq), questions: bySubj.get(k)!.length }));

  const readiness = Math.round(subjects.reduce((a, s) => a + (s.rating?.score ?? 0) * (s.weight / 100), 0));
  const covered = subjects.filter((s) => (s.rating?.questions ?? 0) >= 10);
  const coverage = Math.round((subjects.filter((s) => s.rating).reduce((a, s) => a + s.weight, 0)));
  const attemptedAny = rows.length > 0;

  // Projected marks if the student sat this exam today and attempted everything
  const projected = +subjects.reduce((a, s) => {
    const p = (s.rating?.accuracy ?? 0) / 100, perQ = s.marks / s.questions;
    return a + s.questions * (p * perQ - (1 - p) * perQ * bp.negativeRatio);
  }, 0).toFixed(1);

  // Priority list: biggest marks-at-stake first, with an actionable reason
  const focus: any[] = [];
  for (const s of subjects) {
    if (!s.rating) { focus.push({ type: "subject", subject: s.key, name: s.name, priority: +(s.weight * 0.3).toFixed(2), score: null, reason: `No data yet for ${s.name} (${s.weight}% of the exam). Take one test to get a baseline.`, action: "BASELINE" }); continue; }
    for (const t of s.topics) {
      if (t.questions < 3) continue;
      const gap = Math.max(0, targetScore - t.score);
      if (gap <= 0) continue;
      const share = Math.max(1, t.questions) / Math.max(1, s.rating.questions);
      const priority = +(gap * (s.weight / 100) * (0.5 + share)).toFixed(2);
      let action = "PRACTICE", reason = `${t.accuracy}% accuracy over ${t.questions} questions.`;
      const spqT = spq;
      if (t.accuracy >= 70 && t.avgSec > spqT * 1.5) { action = "SPEED"; reason = `Accurate (${t.accuracy}%) but slow: ${t.avgSec}s per question vs ~${Math.round(spqT)}s allowed in the exam.`; }
      else if (t.accuracy < 50 && t.avgSec < spqT * 0.7) { action = "SLOW_DOWN"; reason = `Only ${t.accuracy}% correct while answering in ${t.avgSec}s: you are rushing. Read fully before choosing.`; }
      else if (t.accuracy < 50) { action = "LEARN"; reason = `${t.accuracy}% accuracy: revise the concept first, then do untimed practice with explanations.`; }
      else if (t.trend !== null && t.trend < -10) { action = "REVISE"; reason = `Accuracy is falling (${t.trend} pts recently). Revise before it slips further.`; }
      focus.push({ type: "topic", subject: s.key, subjectName: s.name, topic: t.topic, priority, score: t.score, accuracy: t.accuracy, avgSec: t.avgSec, questions: t.questions, level: t.level, reason, action });
    }
  }
  focus.sort((a, b) => b.priority - a.priority);

  const strengths = subjects.flatMap((s) => s.topics.filter((t) => t.questions >= 5 && t.score >= 75).map((t) => ({ subject: s.name, topic: t.topic, score: t.score, accuracy: t.accuracy, questions: t.questions }))).sort((a, b) => b.score - a.score).slice(0, 6);

  return { readiness, coverage, projectedMarks: projected, totalMarks, target: targetScore, gap: Math.max(0, targetScore - readiness), subjects, extra, focus: focus.slice(0, 12), strengths, questionsAnalysed: rows.length, attemptedAny, wellCovered: covered.length };
}

/** Split `hours` of study per day across the priority list (minutes). */
export function dailyPlan(focus: any[], hoursPerDay = 2) {
  const total = Math.round(hoursPerDay * 60);
  const items = focus.slice(0, 5); if (!items.length) return [];
  const sum = items.reduce((a, f) => a + Math.max(1, f.priority), 0);
  const label: Record<string, string> = { PRACTICE: "Topic drill", LEARN: "Concept + untimed practice", SPEED: "Timed speed drill", SLOW_DOWN: "Accuracy drill (no rush)", REVISE: "Revision + mixed set", BASELINE: "Take a baseline test" };
  const plan = items.map((f) => ({ topic: f.topic ?? f.name, subject: f.subjectName ?? f.name, minutes: Math.max(10, Math.round((total * Math.max(1, f.priority)) / sum / 5) * 5), task: label[f.action] ?? "Practice" }));
  return plan;
}
