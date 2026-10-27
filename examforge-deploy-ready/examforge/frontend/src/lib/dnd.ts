import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";

/** Touch-friendly drag and drop (pointer events, so it works with a finger as well as a mouse; the browser's own drag does not on phones).
 *  Grab a handle with `start(item)`; mark places to drop with data-zone="..." data-id="..." (and optional data-subject). */
export type DragItem = { kind: "lesson" | "quiz" | "subject"; id: string; from?: "lesson" | "subject"; label: string };
export type DropSpot = { zone: string; id: string; subject?: string; after: boolean };
/** Which drop zones accept which kind of dragged thing. */
export const ACCEPT: Record<DragItem["kind"], string[]> = { lesson: ["lesson", "subject-end"], quiz: ["lesson", "subject-quiz"], subject: ["subject"] };

/** Where `dragId` lands inside `ids` (the list WITHOUT the dragged item) when dropped before/after `targetId`. A missing target means the end. */
export function dropIndex(ids: string[], dragId: string, targetId: string | null, after: boolean): number {
  const rest = ids.filter((x) => x !== dragId); if (targetId === null) return rest.length;
  if (targetId === dragId) return Math.max(0, ids.indexOf(dragId)); // dropped on itself: stays where it is
  const i = rest.indexOf(targetId); return i < 0 ? rest.length : i + (after ? 1 : 0);
}

export function useDnd(onDrop: (d: DragItem, to: DropSpot) => void) {
  const [drag, setDrag] = useState<DragItem | null>(null), [over, setOver] = useState<DropSpot | null>(null), [pos, setPos] = useState({ x: 0, y: 0 });
  const live = useRef<{ drag: DragItem | null; over: DropSpot | null }>({ drag: null, over: null }), cb = useRef(onDrop); cb.current = onDrop;
  const start = (d: DragItem) => (e: RPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return; e.preventDefault(); live.current = { drag: d, over: null }; setOver(null); setPos({ x: e.clientX, y: e.clientY }); setDrag(d);
  };
  useEffect(() => {
    if (!drag) return; let raf = 0, y = 0;
    const find = (x: number, py: number): DropSpot | null => {
      let el = document.elementFromPoint(x, py)?.closest<HTMLElement>("[data-zone]") ?? null;
      while (el && !ACCEPT[drag.kind].includes(el.dataset.zone!)) el = el.parentElement?.closest<HTMLElement>("[data-zone]") ?? null;
      if (!el) return null; const r = el.getBoundingClientRect(); return { zone: el.dataset.zone!, id: el.dataset.id!, subject: el.dataset.subject, after: py > r.top + r.height / 2 };
    };
    const move = (e: PointerEvent) => { y = e.clientY; setPos({ x: e.clientX, y: e.clientY }); const o = find(e.clientX, e.clientY); live.current.over = o; setOver((p) => (p && o && p.zone === o.zone && p.id === o.id && p.after === o.after ? p : o)); };
    const end = (commit: boolean) => { const { drag: d, over: o } = live.current; live.current = { drag: null, over: null }; setDrag(null); setOver(null); if (commit && d && o) cb.current(d, o); };
    const up = () => end(true), cancel = () => end(false), key = (e: KeyboardEvent) => { if (e.key === "Escape") end(false); };
    const tick = () => { if (y && y < 90) window.scrollBy(0, -14); else if (y > innerHeight - 90) window.scrollBy(0, 14); raf = requestAnimationFrame(tick); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel); window.addEventListener("keydown", key); raf = requestAnimationFrame(tick);
    document.body.classList.add("dnd-on");
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); window.removeEventListener("keydown", key); document.body.classList.remove("dnd-on"); };
  }, [drag]);
  return { drag, over, pos, start };
}
