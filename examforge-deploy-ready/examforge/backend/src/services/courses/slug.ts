/** "SSC CGL Maths – Complete Course!" -> "ssc-cgl-maths-complete-course". Always 3-60 chars of a-z, 0-9 and single dashes. */
export function slugify(input: string): string {
  const s = input.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  return s.length >= 3 ? s : `course-${Math.random().toString(36).slice(2, 8)}`;
}
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** First free slug: base, base-2, base-3 … `taken` says whether a candidate is already used by another course. */
export async function uniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  let s = base, n = 1;
  while (await taken(s)) { n++; s = `${base.slice(0, 55)}-${n}`; if (n > 200) { s = `${base.slice(0, 48)}-${Date.now().toString(36)}`; break; } }
  return s;
}
