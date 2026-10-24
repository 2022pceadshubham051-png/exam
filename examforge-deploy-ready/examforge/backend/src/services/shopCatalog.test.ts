import { describe, it, expect } from "vitest";
import { readInv, isConsumable, ITEMS, byId } from "./shopCatalog";
describe("readInv", () => {
  it("survives garbage from the database", () => { expect(readInv(null)).toMatchObject({ owned: [], lifelines: 0, freezes: 0 }); expect(readInv("x")).toMatchObject({ owned: [] }); expect(readInv({ owned: [5, "nope", "title-scholar"], lifelines: -3, freezes: "abc" })).toMatchObject({ owned: ["title-scholar"], lifelines: 0, freezes: 0 }); });
  it("caps freezes at 5 and only equips owned items", () => { expect(readInv({ freezes: 99 }).freezes).toBe(5); expect(readInv({ owned: ["title-scholar"], equipped: { title: "title-legend" } }).equipped.title).toBeUndefined(); });
});
describe("catalog", () => { it("has a buyable streak freeze that is a consumable", () => { const f = byId.get("streak-freeze")!; expect(f.price).toBeGreaterThan(0); expect(isConsumable(f.kind)).toBe(true); expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length); }); });
