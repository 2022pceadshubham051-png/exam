import { describe, it, expect } from "vitest";
import { couponProblem, discountFor, finalPrice, couponState, normalizeCode, type CouponLike } from "./coupons";
import { slugify, uniqueSlug, SLUG_RE } from "./slug";

const base: CouponLike = { code: "DIWALI", percentOff: 20, flatOff: null, courseId: null, startsAt: null, expiresAt: null, maxUses: null, used: 0, active: true };
const d = (s: string) => new Date(s);

describe("coupon rules", () => {
  it("normalizes codes", () => expect(normalizeCode("  diwali 20 ")).toBe("DIWALI20"));
  it("accepts a plain active coupon", () => expect(couponProblem(base, "c1")).toBeNull());
  it("rejects missing / switched-off coupons", () => { expect(couponProblem(null, "c1")).toMatch(/not valid/); expect(couponProblem({ ...base, active: false }, "c1")).toMatch(/not valid/); });
  it("respects the course restriction", () => { expect(couponProblem({ ...base, courseId: "c2" }, "c1")).toMatch(/not valid for this course/); expect(couponProblem({ ...base, courseId: "c1" }, "c1")).toBeNull(); });
  it("respects the time window", () => {
    const now = d("2026-10-24T12:00:00Z");
    expect(couponProblem({ ...base, startsAt: d("2026-10-25T00:00:00Z") }, "c1", now)).toMatch(/not active yet/);
    expect(couponProblem({ ...base, expiresAt: d("2026-10-24T11:59:59Z") }, "c1", now)).toMatch(/expired/);
    expect(couponProblem({ ...base, startsAt: d("2026-10-01T00:00:00Z"), expiresAt: d("2026-11-01T00:00:00Z") }, "c1", now)).toBeNull();
  });
  it("respects the usage limit", () => { expect(couponProblem({ ...base, maxUses: 5, used: 5 }, "c1")).toMatch(/fully used/); expect(couponProblem({ ...base, maxUses: 5, used: 4 }, "c1")).toBeNull(); });
  it("computes percent and flat discounts, capped at the price", () => {
    expect(discountFor(999, { percentOff: 20, flatOff: null })).toBe(199);
    expect(finalPrice(999, { percentOff: 20, flatOff: null })).toBe(800);
    expect(discountFor(500, { percentOff: null, flatOff: 150 })).toBe(150);
    expect(finalPrice(100, { percentOff: null, flatOff: 500 })).toBe(0);
    expect(finalPrice(100, { percentOff: 100, flatOff: null })).toBe(0);
    expect(finalPrice(0, { percentOff: 50, flatOff: null })).toBe(0);
  });
  it("reports a state for the admin list", () => {
    const now = d("2026-10-24T12:00:00Z");
    expect(couponState(base, now)).toBe("active"); expect(couponState({ ...base, active: false }, now)).toBe("off");
    expect(couponState({ ...base, expiresAt: d("2026-10-01T00:00:00Z") }, now)).toBe("expired"); expect(couponState({ ...base, startsAt: d("2026-12-01T00:00:00Z") }, now)).toBe("scheduled");
    expect(couponState({ ...base, maxUses: 1, used: 1 }, now)).toBe("exhausted");
  });
});

describe("slugs", () => {
  it("makes url-safe slugs", () => { expect(slugify("SSC CGL Maths – Complete Course!")).toBe("ssc-cgl-maths-complete-course"); expect(SLUG_RE.test(slugify("  Café   Maths  "))).toBe(true); });
  it("falls back for titles with no latin letters", () => expect(slugify("गणित")).toMatch(/^course-[a-z0-9]+$/));
  it("finds the first free slug", async () => { const used = new Set(["maths", "maths-2"]); expect(await uniqueSlug("maths", async (s) => used.has(s))).toBe("maths-3"); });
});
