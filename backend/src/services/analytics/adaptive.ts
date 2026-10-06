import type { Difficulty } from "@prisma/client";

type Candidate = {
  id: string;
  sectionId: string | null;
  topic: string | null;
  difficulty: Difficulty;
};

type History = { topic: string | null; isCorrect: boolean | null; timeSpentMs: number };

type TopicStat = { total: number; correct: number; totalMs: number };

function seededRank(seed: number, id: string) {
  let h = seed >>> 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
  return (h >>> 0) / 0xffffffff;
}

export function buildAdaptiveSelection(candidates: Candidate[], history: History[], desired: number, seed: number) {
  const byTopic = new Map<string, TopicStat>();
  for (const h of history) {
    if (!h.topic) continue;
    const s = byTopic.get(h.topic) ?? { total: 0, correct: 0, totalMs: 0 };
    s.total += 1;
    if (h.isCorrect) s.correct += 1;
    s.totalMs += h.timeSpentMs || 0;
    byTopic.set(h.topic, s);
  }

  const topicNames = [...new Set(candidates.map((q) => q.topic).filter(Boolean) as string[])];
  const topicScore = (topic: string | null) => {
    if (!topic) return 0.35;
    const s = byTopic.get(topic);
    if (!s) return 0.58; // unseen topics get a healthy exploration weight
    const accuracy = s.total ? s.correct / s.total : 0.5;
    const avgSec = s.total ? s.totalMs / s.total / 1000 : 45;
    const speedPenalty = Math.min(avgSec / 90, 1);
    return (1 - accuracy) * 0.72 + speedPenalty * 0.18 + (s.total < 5 ? 0.1 : 0);
  };

  const strongest = Math.max(...topicNames.map(topicScore), 0.58);
  const targetDifficulty = (topic: string | null): Difficulty[] => {
    const score = topicScore(topic);
    if (score >= 0.48) return ["MEDIUM", "HARD", "EASY"];
    if (score >= 0.28) return ["MEDIUM", "EASY", "HARD"];
    return ["HARD", "MEDIUM", "EASY"];
  };

  const ranked = [...candidates].sort((a, b) => {
    const weakness = topicScore(b.topic) - topicScore(a.topic);
    if (Math.abs(weakness) > 0.03) return weakness;
    const td = targetDifficulty(b.topic), bd = targetDifficulty(a.topic);
    const da = td.indexOf(a.difficulty), db = bd.indexOf(b.difficulty);
    if (da !== db) return da - db;
    return seededRank(seed, a.id) - seededRank(seed, b.id);
  });

  const targetTopics = topicNames.sort((a, b) => topicScore(b) - topicScore(a));
  const selected: Candidate[] = [];
  const selectedIds = new Set<string>();
  const topicQuota = Math.max(2, Math.ceil(desired / Math.max(1, Math.min(4, targetTopics.length || 1))));

  for (const topic of targetTopics.slice(0, 4)) {
    const pool = ranked.filter((q) => q.topic === topic && !selectedIds.has(q.id));
    for (const q of pool.slice(0, topicQuota)) {
      selected.push(q); selectedIds.add(q.id);
      if (selected.length >= desired) return summarize(selected, targetTopics, topicScore, strongest);
    }
  }

  for (const q of ranked) {
    if (selectedIds.has(q.id)) continue;
    selected.push(q); selectedIds.add(q.id);
    if (selected.length >= desired) break;
  }

  return summarize(selected, targetTopics, topicScore, strongest);
}

function summarize(selected: Candidate[], topics: string[], score: (topic: string | null) => number, peak: number) {
  return {
    questionIds: selected.map((q) => q.id),
    topics: topics.slice(0, 4).filter((t) => selected.some((q) => q.topic === t)),
    focusScore: +Math.min(1, peak).toFixed(2),
    selectedCount: selected.length,
    difficultyMix: selected.reduce<Record<string, number>>((m, q) => { m[q.difficulty] = (m[q.difficulty] ?? 0) + 1; return m; }, {}),
    topicScores: topics.slice(0, 6).map((topic) => ({ topic, weakness: +score(topic).toFixed(2) })),
  };
}
