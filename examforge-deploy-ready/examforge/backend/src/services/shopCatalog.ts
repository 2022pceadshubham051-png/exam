// Single source of truth for what coins can buy. The frontend renders whatever this returns.
export type Kind = "title" | "frame" | "lifeline" | "freeze";
/** Consumables can be bought again and again; cosmetics are bought once. */
export const isConsumable = (k: Kind) => k === "lifeline" || k === "freeze";
export interface Item { id: string; kind: Kind; name: string; emoji: string; price: number; desc: string }

export const ITEMS: Item[] = [
  { id: "lifeline", kind: "lifeline", name: "50-50 Lifeline", emoji: "🎯", price: 30, desc: "Practice mode: removes two wrong options from one question. Buy as many as you need." },
  { id: "streak-freeze", kind: "freeze", name: "Streak Freeze", emoji: "🧊", price: 60, desc: "Saves your streak if you miss a day. It is used automatically. Hold up to 5." },
  { id: "title-scholar", kind: "title", name: "Scholar", emoji: "📚", price: 80, desc: "Shows next to your name on the leaderboards." },
  { id: "title-speedster", kind: "title", name: "Speedster", emoji: "⚡", price: 120, desc: "For people who beat the clock." },
  { id: "title-nightowl", kind: "title", name: "Night Owl", emoji: "🦉", price: 150, desc: "Late-night grinders only." },
  { id: "title-topper", kind: "title", name: "Topper", emoji: "⭐", price: 250, desc: "Tell everyone where you are headed." },
  { id: "title-legend", kind: "title", name: "Legend", emoji: "👑", price: 500, desc: "The rarest title in ExamForge." },
  { id: "frame-gold", kind: "frame", name: "Gold name", emoji: "🥇", price: 150, desc: "Your name shines gold on the leaderboards." },
  { id: "frame-neon", kind: "frame", name: "Neon name", emoji: "💠", price: 200, desc: "A glowing cyan name." },
  { id: "frame-fire", kind: "frame", name: "Fire name", emoji: "🔥", price: 300, desc: "A blazing orange name." },
  { id: "frame-rainbow", kind: "frame", name: "Rainbow name", emoji: "🌈", price: 400, desc: "An animated rainbow name." },
];
export const byId = new Map(ITEMS.map((i) => [i.id, i]));

export interface Inv { owned: string[]; lifelines: number; freezes: number; equipped: { title?: string; frame?: string } }
export function readInv(raw: unknown): Inv {
  const r = (raw && typeof raw === "object" ? raw : {}) as any;
  const owned = Array.isArray(r.owned) ? r.owned.filter((x: any) => typeof x === "string" && byId.has(x)) : [];
  const eq = r.equipped && typeof r.equipped === "object" ? r.equipped : {};
  return { owned, lifelines: Math.max(0, Math.floor(Number(r.lifelines) || 0)), freezes: Math.max(0, Math.min(5, Math.floor(Number(r.freezes) || 0))),
    equipped: { title: owned.includes(eq.title) ? eq.title : undefined, frame: owned.includes(eq.frame) ? eq.frame : undefined } };
}
/** What other people see next to a name on a leaderboard. */
export function cosmetics(raw: unknown) {
  const inv = readInv(raw), t = inv.equipped.title ? byId.get(inv.equipped.title) : null;
  return { title: t ? `${t.emoji} ${t.name}` : null, frame: inv.equipped.frame ? inv.equipped.frame.replace("frame-", "") : null };
}
