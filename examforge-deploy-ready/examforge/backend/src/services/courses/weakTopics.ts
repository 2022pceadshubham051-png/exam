/** "Which station should I watch again?" Maps the topics a student got wrong in a course quiz to lectures of that course. */
export type Station = { lessonId: string; title: string; n: number; subjectId: string; subjectName: string };
export type Wrong = { topic: string | null; subject: string | null };
export type Revisit = { topic: string; wrong: number; lessonId: string; title: string; n: number; subjectName: string; exact: boolean };
/** Where the quiz sits: after one lecture, or at the end of a subject. */
export type Anchor = { kind: "lesson"; lessonId: string } | { kind: "subject"; subjectId: string };

const STOP = new Set(["the", "and", "of", "for", "in", "on", "to", "a", "an", "with", "part", "lecture", "class", "chapter", "basics", "basic", "introduction"]);
const words = (s: string) => (s.toLowerCase().normalize("NFKD").match(/[a-z0-9\u0900-\u097f]+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w));

/** 0 = nothing in common. A full phrase inside the title counts most, then shared words. */
export function matchScore(topic: string, title: string): number {
  const a = topic.toLowerCase().trim(), b = title.toLowerCase();
  if (!a) return 0; if (b.includes(a)) return 10 + a.length / 100;
  const wa = words(topic), wb = new Set(words(title)); if (!wa.length) return 0;
  const hit = wa.filter((w) => wb.has(w) || [...wb].some((x) => x.length >= 4 && w.length >= 4 && (x.startsWith(w) || w.startsWith(x)))).length;
  return hit / wa.length;
}

/** Best lectures to watch again. The topic text of each wrong answer is matched against the lecture titles the quiz covers
 *  (a lecture quiz covers that subject up to and including its lecture; a subject quiz covers the whole subject).
 *  A lecture quiz with no title match falls back to its own lecture; a subject quiz with no match is counted in `unmatched`. */
export function revisitStations(wrong: Wrong[], stations: Station[], anchor: Anchor, max = 4): { items: Revisit[]; unmatched: number } {
  let pool: Station[];
  if (anchor.kind === "lesson") { const at = stations.find((s) => s.lessonId === anchor.lessonId); if (!at) return { items: [], unmatched: wrong.length };
    pool = stations.filter((s) => s.subjectId === at.subjectId && s.n <= at.n); }
  else pool = stations.filter((s) => s.subjectId === anchor.subjectId);
  if (!pool.length) return { items: [], unmatched: wrong.length };
  const groups = new Map<string, number>();
  for (const w of wrong) { const k = (w.topic || w.subject || "").trim(); if (k && k !== "Unknown") groups.set(k, (groups.get(k) ?? 0) + 1); }
  const own = anchor.kind === "lesson" ? pool.find((s) => s.lessonId === anchor.lessonId)! : null;
  const byLesson = new Map<string, Revisit & { topics: string[] }>(); let unmatched = wrong.filter((w) => !(w.topic || w.subject)?.trim() || (w.topic || w.subject) === "Unknown").length;
  for (const [topic, count] of groups) {
    let best: Station | null = null, top = 0;
    for (const s of pool) { const sc = matchScore(topic, s.title); if (sc > top) { top = sc; best = s; } }
    const exact = !!best && top >= 0.5; if (!exact) { best = own; top = 0; }
    if (!best) { unmatched += count; continue; }
    const cur = byLesson.get(best.lessonId);
    if (cur) { cur.wrong += count; cur.topics.push(topic); cur.exact = cur.exact || exact; if (count > (groups.get(cur.topic) ?? 0)) cur.topic = topic; }
    else byLesson.set(best.lessonId, { topic, topics: [topic], wrong: count, lessonId: best.lessonId, title: best.title, n: best.n, subjectName: best.subjectName, exact });
  }
  const items = [...byLesson.values()].sort((a, b) => b.wrong - a.wrong || a.n - b.n).slice(0, max).map(({ topics, ...r }) => r);
  return { items, unmatched };
}
