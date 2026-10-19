// Exam "journey skin": the illustration + accent palette that follows the student's target exam.
//   train   -> RRB (NTPC, Group D, ALP...)      library -> UPSC, CTET/TET, CUET, CAT, NET (reading-heavy exams)
//   ground  -> physical-test exams (SSC GD, CPO, MTS, NDA, police, army)
//   ssc     -> SSC CGL / CHSL (a pen writing)   bank -> IBPS / SBI / RBI (a rolling rupee coin)
//   neet    -> NEET / medical (a heartbeat)     lab  -> JEE / GATE / engineering (an atom on a ruler)
// Stored in localStorage only: "ef_skin" = user override ("auto" when unset), "ef_skin_auto" = last skin derived from the target exam.
// Kept dependency-free so theme.ts and profile.ts can both import it without a cycle.
export type Skin = "train" | "library" | "ground" | "ssc" | "bank" | "neet" | "lab";
export type SkinPref = "auto" | Skin;
export const SKINS: Skin[] = ["train", "ssc", "bank", "neet", "lab", "library", "ground"];
export const SKIN_NAMES: Record<Skin, string> = { train: "Railway", library: "Library", ground: "Ground", ssc: "Pen", bank: "Coin", neet: "Pulse", lab: "Lab" };
export const SKIN_HINTS: Record<Skin, string> = { train: "A train on the track. Made for RRB.", library: "A shelf that fills with books. Warm paper tones.", ground: "A runner on the track. Green and fresh.", ssc: "A pen that writes your progress. Maroon and saffron. Made for SSC.", bank: "A rupee coin rolling along. Green and gold. Made for banking exams.", neet: "A heartbeat on the monitor. Teal and coral. Made for NEET.", lab: "An atom on a ruler. Made for JEE and GATE." };
const K = { pref: "ef_skin", auto: "ef_skin_auto" };
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const isSkin = (v: unknown): v is Skin => typeof v === "string" && (SKINS as string[]).includes(v);

/** Which skin suits an exam name. Unknown exams get the railway default. */
export function skinForExam(exam: string | null | undefined): Skin {
  const raw = (exam ?? "").toLowerCase(), e = raw.replace(/[^a-z0-9]/g, "");
  if (!e) return "train";
  if (/rrb|railway|ntpc|groupd|alp|rpf/.test(e)) return "train";
  if (/ssc(gd|cpo|mts)|gdconstable|constable|police|nda|agniveer|army|capf|cds/.test(e)) return "ground";
  if (/neet|aiims|medical|mbbs|nursing|pharm/.test(e)) return "neet";
  if (/jee|gate|iit|engineering|btech|bitsat|isro/.test(e)) return "lab";
  if (/bank|ibps|sbi|rbi|nabard|clerk/.test(e) || /(^|[^a-z])po([^a-z]|$)/.test(raw)) return "bank";
  if (/ssc|cgl|chsl/.test(e)) return "ssc";
  if (/upsc|ctet|tet|cuet|cat|net|ugc|ias|civil/.test(e)) return "library";
  return "train";
}
export const getSkinPref = (): SkinPref => { const v = read(K.pref); return isSkin(v) ? v : "auto"; };
export const getSkin = (): Skin => { const p = getSkinPref(); if (p !== "auto") return p; const a = read(K.auto); return isSkin(a) ? a : "train"; };
/** Remember the skin for this student's exam (called whenever the profile loads or changes). */
export function syncSkinFromExam(exam: string | null | undefined) { write(K.auto, skinForExam(exam)); window.dispatchEvent(new Event("ef-skin")); }
export function setSkinPref(p: SkinPref) { write(K.pref, p === "auto" ? null : p); window.dispatchEvent(new Event("ef-skin")); }
