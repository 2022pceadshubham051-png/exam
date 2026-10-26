import { describe, it, expect } from "vitest"; import { pickEvictions, deviceLabel } from "./sessions";
const d = (id: string, m: number) => ({ id, lastSeen: new Date(2026, 0, 1, 0, m) });
describe("device limit", () => {
  it("keeps everyone while under the limit", () => { expect(pickEvictions([d("a", 1)], 2)).toEqual([]); expect(pickEvictions([], 2)).toEqual([]); });
  it("drops the least recently used when a new device would exceed the limit", () => { expect(pickEvictions([d("a", 1), d("b", 5)], 2).map((x) => x.id)).toEqual(["a"]); expect(pickEvictions([d("a", 1), d("b", 5), d("c", 3)], 2).map((x) => x.id).sort()).toEqual(["a", "c"]); });
  it("limit of 1 drops all others", () => expect(pickEvictions([d("a", 1), d("b", 2)], 1)).toHaveLength(2));
  it("labels devices", () => { expect(deviceLabel("Mozilla/5.0 (Linux; Android 13) AppleWebKit Chrome/120 Mobile Safari/537.36")).toBe("Android · Chrome"); expect(deviceLabel("")).toBe("Device"); });
});
