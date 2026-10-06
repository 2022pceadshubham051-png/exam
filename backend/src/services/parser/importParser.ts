export interface ParsedQuestion {
  index: number; text: string; options: { key: string; text: string }[];
  correctKey: string | null; explanation?: string; difficulty?: string; topic?: string;
  errors: string[];
}
const KEYS = ["A", "B", "C", "D"];
const OPT_RE = /^\s*(?:(?:option\s+)?\(?([A-Da-d])\s*[\).:\-]|\(([A-Da-d])\))\s*(.+)$/i;
const Q_RE = /^\s*(?:question|q)\s*\.?\s*(\d+)\s*[\).:\-]?\s*(.*)$/i;
const NUM_RE = /^\s*(\d+)\s*[\).]\s+(.+)$/;
const ANS_RE = /^\s*(?:correct\s*answer|correct\s*option|correct|answer|ans)\s*[:\-]\s*(.+)$/i;
const EXP_RE = /^\s*explanation\s*[:\-]?\s*(.*)$/i;
const DIFF_RE = /^\s*difficulty\s*[:\-]\s*(\w+)/i;
const TOPIC_RE = /^\s*(?:topic|subject)\s*[:\-]\s*(.+)$/i;

export const preprocess = (t: string) => t.replace(/\r/g, "").replace(/\*\*/g, "").replace(/[ \t]+$/gm, "");

function resolveAnswer(raw: string, opts: { key: string; text: string }[]): string | null {
  const v = raw.trim().replace(/[*.`]/g, "");
  const m = v.match(/^(?:option\s*)?\(?([A-E])\)?(?:\s|$|:|-)/i);
  if (m) return m[1].toUpperCase();
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const hits = opts.filter((o) => norm(o.text) === norm(v));
  return hits.length === 1 ? hits[0].key : null;
}

type Draft = ParsedQuestion & { rawAns?: string; mode: string };
export function parseQuestions(input: string): ParsedQuestion[] {
  const lines = preprocess(input).split("\n");
  const out: ParsedQuestion[] = [];
  let cur: Draft | null = null;
  const push = () => { if (cur) { finalize(cur); out.push(cur); } };
  for (const line of lines) {
    if (!line.trim()) continue;
    const qm: RegExpExecArray | null = Q_RE.exec(line) ?? (cur && cur.options.length >= 2 ? NUM_RE.exec(line) : !cur ? NUM_RE.exec(line) : null);
    if (qm) { push(); cur = { index: out.length + 1, text: qm[2] ?? "", options: [], correctKey: null, errors: [], mode: "q" }; continue; }
    if (!cur) continue;
    let m: RegExpExecArray | null;
    if ((m = ANS_RE.exec(line))) { cur.rawAns = m[1]; cur.mode = "ans"; continue; }
    if ((m = EXP_RE.exec(line))) { cur.explanation = m[1]; cur.mode = "exp"; continue; }
    if ((m = DIFF_RE.exec(line))) { cur.difficulty = m[1].toUpperCase(); continue; }
    if ((m = TOPIC_RE.exec(line))) { cur.topic = m[1].trim(); continue; }
    if (cur.mode !== "exp" && (m = OPT_RE.exec(line))) { cur.options.push({ key: (m[1] ?? m[2]).toUpperCase(), text: m[3].trim() }); cur.mode = "opt"; continue; }
    if (cur.mode === "q") cur.text += (cur.text ? " " : "") + line.trim();
    else if (cur.mode === "exp") cur.explanation = ((cur.explanation ?? "") + " " + line.trim()).trim();
    else if (cur.mode === "opt" && cur.options.length) cur.options[cur.options.length - 1].text += " " + line.trim();
  }
  push();
  return out;
}

function finalize(q: Draft) {
  q.text = q.text.trim();
  if (!q.text) q.errors.push("Question text is empty");
  const keys = q.options.map((o) => o.key);
  for (const k of KEYS) if (!keys.includes(k)) q.errors.push(`Missing option ${k}`);
  if (keys.length !== new Set(keys).size) q.errors.push("Duplicate option keys");
  if (q.options.some((o) => !o.text.trim())) q.errors.push("Empty option text");
  const texts = q.options.map((o) => o.text.toLowerCase().trim());
  if (texts.length !== new Set(texts).size) q.errors.push("Duplicate option text");
  if (q.rawAns === undefined) q.errors.push("⚠️ Answer Detection Failed: no answer line found");
  else if (/\b[A-D]\s*(,|&|and|\/)\s*[A-D]\b/i.test(q.rawAns)) q.errors.push("Multiple correct answers detected");
  else {
    const k = resolveAnswer(q.rawAns, q.options);
    if (!k) q.errors.push(`⚠️ Answer Detection Failed: "${q.rawAns}" matches no option`);
    else if (!keys.includes(k)) q.errors.push(`Correct answer "${k}" does not exist`);
    else q.correctKey = k;
  }
  q.options.sort((a, b) => a.key.localeCompare(b.key));
  delete (q as Partial<Draft>).rawAns; delete (q as Partial<Draft>).mode;
}
export const isPublishable = (q: ParsedQuestion) => q.errors.length === 0 && !!q.correctKey;
