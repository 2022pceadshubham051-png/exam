import { describe, it, expect } from "vitest";
import { dropIndex, ACCEPT } from "./dnd";

describe("dropIndex", () => {
  const ids = ["a", "b", "c", "d"];
  it("drops before or after a target, counted without the dragged item", () => { expect(dropIndex(ids, "a", "c", false)).toBe(1); expect(dropIndex(ids, "a", "c", true)).toBe(2); expect(dropIndex(ids, "d", "a", false)).toBe(0); });
  it("a drop on itself keeps its place", () => expect(dropIndex(ids, "b", "b", false)).toBe(1));
  it("end of list and unknown targets", () => { expect(dropIndex(ids, "a", null, false)).toBe(3); expect(dropIndex(ids, "a", "zzz", true)).toBe(3); });
  it("lets a lecture from another subject land in the list", () => expect(dropIndex(["x", "y"], "new", "x", true)).toBe(1));
});
describe("ACCEPT", () => it("keeps the three kinds of drag apart", () => { expect(ACCEPT.subject).toEqual(["subject"]); expect(ACCEPT.lesson).not.toContain("subject-quiz"); expect(ACCEPT.quiz).toContain("subject-quiz"); }));
