// Exam "journey skin": the illustration + accent palette that follows the student's target exam.
//   train   -> RRB (NTPC, Group D, ALP...)      library -> SSC CGL / CHSL, banking, most desk exams
//   ground  -> physical-test exams (SSC GD, CPO, MTS, NDA, police, army)
// Stored in localStorage only: "ef_skin" = user override ("auto" when unset), "ef_skin_auto" = last skin derived from the target exam.
// Kept dependency-free so theme.ts and profile.ts can both import it without a cycle.
export type Skin = "train" | "library" | "ground";
export type SkinPref = "auto" | Skin;
export const SKINS: Skin[] = ["train", "library", "ground"];
export const SKIN_NAMES: Record<Skin, string> = { train: "Railway", library: "Library", ground: "Ground" };
export const SKIN_HINTS: Record<Skin, string> = { train: "A train on the track. Made for RRB.", library: "A shelf that fills with books. Warm paper tones.", ground: "A runner on the track. Green and fresh." };
const K = { pref: "ef_skin", auto: "ef_skin_auto" };
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const isSkin = (v: unknown): v is Skin => v === "train" || v === "library" || v === "ground";

/** Which skin suits an exam name. Unknown exams get the railway default. */
export function skinForExam(exam: string | null | undefined): Skin {
  const e = (exam ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!e) return "train";
  if (/rrb|railway|ntpc|groupd|alp|rpf/.test(e)) return "train";
  if (/ssc(gd|cpo|mts)|gdconstable|constable|police|nda|agniveer|army|capf|cds/.test(e)) return "ground";
  if (/ssc|cgl|chsl|bank|ibps|sbi|po|clerk|upsc|ctet|tet|cuet|gate|cat|neet|jee|net/.test(e)) return "library";
  return "train";
}
export const getSkinPref = (): SkinPref => { const v = read(K.pref); return isSkin(v) ? v : "auto"; };
export const getSkin = (): Skin => { const p = getSkinPref(); if (p !== "auto") return p; const a = read(K.auto); return isSkin(a) ? a : "train"; };
/** Remember the skin for this student's exam (called whenever the profile loads or changes). */
export function syncSkinFromExam(exam: string | null | undefined) { write(K.auto, skinForExam(exam)); window.dispatchEvent(new Event("ef-skin")); }
export function setSkinPref(p: SkinPref) { write(K.pref, p === "auto" ? null : p); window.dispatchEvent(new Event("ef-skin")); }
