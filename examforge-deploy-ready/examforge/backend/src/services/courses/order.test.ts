import { describe, it, expect } from "vitest";
import { placeAt, sameSet } from "./order";

describe("placeAt", () => {
  it("moves an item forward and back", () => { expect(placeAt(["a", "b", "c", "d"], "a", 2)).toEqual(["b", "c", "a", "d"]); expect(placeAt(["a", "b", "c", "d"], "d", 0)).toEqual(["d", "a", "b", "c"]); });
  it("clamps the index", () => { expect(placeAt(["a", "b"], "a", 99)).toEqual(["b", "a"]); expect(placeAt(["a", "b"], "b", -5)).toEqual(["b", "a"]); });
  it("inserts an id that came from another list", () => expect(placeAt(["a", "b"], "x", 1)).toEqual(["a", "x", "b"]));
  it("keeps the order when dropped where it already is", () => expect(placeAt(["a", "b", "c"], "b", 1)).toEqual(["a", "b", "c"]));
});
describe("sameSet", () => {
  it("accepts any order of the same ids", () => expect(sameSet(["a", "b", "c"], ["c", "a", "b"])).toBe(true));
  it("rejects missing, extra and repeated ids", () => { expect(sameSet(["a", "b"], ["a"])).toBe(false); expect(sameSet(["a", "b"], ["a", "b", "c"])).toBe(false); expect(sameSet(["a", "b"], ["a", "a"])).toBe(false); });
});
