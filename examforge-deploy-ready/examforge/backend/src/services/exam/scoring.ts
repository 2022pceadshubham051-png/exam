export interface ScoreInput { selectedKey: string | null; correctKey: string; sectionId: string; topic?: string | null; difficulty?: string | null; timeSpentMs: number }
export function calculateScore(rs: ScoreInput[], pos = 1, neg = 0.25) {
  const correct = rs.filter((r) => r.selectedKey && r.selectedKey === r.correctKey).length;
  const incorrect = rs.filter((r) => r.selectedKey && r.selectedKey !== r.correctKey).length;
  const attempted = correct + incorrect;
  return { correct, incorrect, attempted, unanswered: rs.length - attempted,
    score: +(correct * pos - incorrect * neg).toFixed(2), totalMarks: rs.length * pos,
    negativeTotal: +(incorrect * neg).toFixed(2),
    accuracy: attempted ? +((correct / attempted) * 100).toFixed(1) : 0,
    attemptRate: rs.length ? +((attempted / rs.length) * 100).toFixed(1) : 0 };
}
export function groupPerformance(rs: ScoreInput[], by: "sectionId" | "topic" | "difficulty", pos = 1, neg = 0.25) {
  const g: Record<string, ScoreInput[]> = {};
  rs.forEach((r) => (g[String(r[by] ?? "Unknown")] ??= []).push(r));
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { ...calculateScore(v, pos, neg),
    avgTimeSec: Math.round(v.reduce((a, r) => a + r.timeSpentMs, 0) / v.length / 1000) }]));
}
