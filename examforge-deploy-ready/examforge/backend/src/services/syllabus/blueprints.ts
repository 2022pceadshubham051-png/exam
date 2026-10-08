import type { SubjectKey } from "./classifier";
// Exam patterns used for weightage + readiness. Boards change patterns: confirm against the latest official notice.
export interface BlueprintSubject { key: SubjectKey; name: string; questions: number; marks: number }
export interface Blueprint {
  id: string; name: string; group: "SSC" | "Railway" | "IMD" | "Custom"; stage: string;
  durationMin: number; negativeRatio: number; // fraction of a question's marks deducted for a wrong answer
  subjects: BlueprintSubject[]; note?: string; confidence: "high" | "medium";
}
const S = (key: SubjectKey, name: string, questions: number, marks: number): BlueprintSubject => ({ key, name, questions, marks });
export const BLUEPRINTS: Blueprint[] = [
  { id: "ssc-cgl-t1", name: "SSC CGL", group: "SSC", stage: "Tier-1", durationMin: 60, negativeRatio: 0.25, confidence: "high",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 25, 50), S("ga", "General Awareness", 25, 50), S("quant", "Quantitative Aptitude", 25, 50), S("english", "English Comprehension", 25, 50)] },
  { id: "ssc-chsl-t1", name: "SSC CHSL", group: "SSC", stage: "Tier-1", durationMin: 60, negativeRatio: 0.25, confidence: "high",
    subjects: [S("english", "English Language", 25, 50), S("reasoning", "General Intelligence", 25, 50), S("quant", "Quantitative Aptitude", 25, 50), S("ga", "General Awareness", 25, 50)] },
  { id: "ssc-mts", name: "SSC MTS", group: "SSC", stage: "Paper-1 (2 sessions)", durationMin: 90, negativeRatio: 0.33, confidence: "medium",
    subjects: [S("quant", "Numerical & Mathematical Ability", 20, 60), S("reasoning", "Reasoning Ability & Problem Solving", 20, 60), S("ga", "General Awareness", 25, 75), S("english", "English Language & Comprehension", 25, 75)],
    note: "Negative-marking details differ by session; confirm in the notice." },
  { id: "ssc-gd", name: "SSC GD Constable", group: "SSC", stage: "CBE", durationMin: 60, negativeRatio: 0.25, confidence: "high",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 20, 40), S("ga", "General Knowledge & Awareness", 20, 40), S("quant", "Elementary Mathematics", 20, 40), S("english", "English / Hindi", 20, 40)] },
  { id: "ssc-cpo", name: "SSC CPO (SI)", group: "SSC", stage: "Paper-1", durationMin: 120, negativeRatio: 0.25, confidence: "high",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 50, 50), S("ga", "General Knowledge & Awareness", 50, 50), S("quant", "Quantitative Aptitude", 50, 50), S("english", "English Comprehension", 50, 50)] },
  { id: "rrb-ntpc-cbt1", name: "Railway NTPC", group: "Railway", stage: "CBT-1", durationMin: 90, negativeRatio: 0.33, confidence: "high",
    subjects: [S("ga", "General Awareness", 40, 40), S("quant", "Mathematics", 30, 30), S("reasoning", "General Intelligence & Reasoning", 30, 30)] },
  { id: "rrb-ntpc-cbt2", name: "Railway NTPC", group: "Railway", stage: "CBT-2 (Graduate)", durationMin: 90, negativeRatio: 0.33, confidence: "high",
    subjects: [S("ga", "General Awareness", 50, 50), S("quant", "Mathematics", 35, 35), S("reasoning", "General Intelligence & Reasoning", 35, 35)] },
  { id: "rrb-group-d", name: "Railway Group D", group: "Railway", stage: "CBT", durationMin: 90, negativeRatio: 0.33, confidence: "high",
    subjects: [S("science", "General Science", 25, 25), S("quant", "Mathematics", 25, 25), S("reasoning", "General Intelligence & Reasoning", 30, 30), S("ga", "General Awareness & Current Affairs", 20, 20)] },
  { id: "imd-sa-cs", name: "SSC IMD Scientific Assistant (CS & IT)", group: "IMD", stage: "Paper-I + Paper-II", durationMin: 180, negativeRatio: 0.25, confidence: "medium",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 50, 50), S("ga", "General Awareness", 50, 50), S("cs", "CS & IT (Paper-I + Paper-II)", 200, 400)],
    note: "Paper-I = 200 Q/200 marks (-0.25); Paper-II = 100 Q/300 marks (-1). The Paper-I split between sections is assumed 50/50/100." },
  { id: "imd-sa-ece", name: "SSC IMD Scientific Assistant (Electronics & Telecom)", group: "IMD", stage: "Paper-I + Paper-II", durationMin: 180, negativeRatio: 0.25, confidence: "medium",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 50, 50), S("ga", "General Awareness", 50, 50), S("electronics", "Electronics & Telecom (Paper-I + II)", 200, 400)],
    note: "Paper-I split between sections is assumed 50/50/100." },
  { id: "imd-sa-physics", name: "SSC IMD Scientific Assistant (Physics)", group: "IMD", stage: "Paper-I + Paper-II", durationMin: 180, negativeRatio: 0.25, confidence: "medium",
    subjects: [S("reasoning", "General Intelligence & Reasoning", 50, 50), S("ga", "General Awareness", 50, 50), S("physics", "Physics (Paper-I + Paper-II)", 200, 400)],
    note: "Paper-I split between sections is assumed 50/50/100." },
];

export const blueprintById = (id?: string | null) => BLUEPRINTS.find((b) => b.id === id) ?? null;

export function withWeights(b: Blueprint) {
  const totalMarks = b.subjects.reduce((a, s) => a + s.marks, 0), totalQ = b.subjects.reduce((a, s) => a + s.questions, 0);
  return { ...b, totalMarks, totalQuestions: totalQ, secondsPerQuestion: Math.round((b.durationMin * 60) / Math.max(1, totalQ)),
    subjects: b.subjects.map((s) => ({ ...s, weight: +((s.marks / totalMarks) * 100).toFixed(1) })) };
}

/** Build an ad-hoc blueprint from "reasoning:30,quant:30,english:20,ga:20" style weights. */
export function customBlueprint(spec: string): Blueprint | null {
  const subjects: BlueprintSubject[] = [];
  const names: Record<string, string> = { reasoning: "Reasoning", quant: "Maths / Quant", english: "English", ga: "General Awareness", science: "General Science", computer: "Computer", hindi: "Hindi", physics: "Physics", cs: "CS & IT", electronics: "Electronics" };
  for (const part of spec.split(",")) {
    const [k, v] = part.split(":"); const n = Number(v);
    if (k in names && n > 0 && n <= 500) subjects.push(S(k as SubjectKey, names[k], Math.round(n), Math.round(n)));
  }
  return subjects.length ? { id: "custom", name: "Custom exam", group: "Custom", stage: "Your weightage", durationMin: 60, negativeRatio: 0.25, subjects, confidence: "medium" } : null;
}
