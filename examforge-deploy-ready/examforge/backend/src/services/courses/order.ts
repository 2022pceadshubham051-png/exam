/** Pure helpers for the admin drag-and-drop ordering of subjects, lectures and quizzes. */

/** `ids` with `id` taken out and put back at `index` (clamped). Unknown ids are not added. */
export function placeAt(ids: string[], id: string, index: number): string[] {
  const rest = ids.filter((x) => x !== id), i = Math.max(0, Math.min(rest.length, Math.floor(Number.isFinite(index) ? index : rest.length)));
  return [...rest.slice(0, i), id, ...rest.slice(i)];
}

/** Does `next` hold exactly the same ids as `current` (any order, no repeats)? Guards the "save this new order" call. */
export function sameSet(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false;
  const a = new Set(current), b = new Set(next); return a.size === current.length && b.size === next.length && next.every((x) => a.has(x));
}
