/** Pure coupon rules (no database), so they can be unit-tested. Amounts are whole rupees. */
export interface CouponLike { code: string; percentOff: number | null; flatOff: number | null; courseId: string | null; startsAt: Date | null; expiresAt: Date | null; maxUses: number | null; used: number; active: boolean }

export const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

/** Why this coupon cannot be used right now (a student-friendly sentence), or null when it can. */
export function couponProblem(c: CouponLike | null | undefined, courseId: string, now = new Date()): string | null {
  if (!c || !c.active) return "That coupon code is not valid.";
  if (c.courseId && c.courseId !== courseId) return "This coupon is not valid for this course.";
  if (c.startsAt && c.startsAt.getTime() > now.getTime()) return "This coupon is not active yet.";
  if (c.expiresAt && c.expiresAt.getTime() < now.getTime()) return "This coupon has expired.";
  if (c.maxUses != null && c.used >= c.maxUses) return "This coupon has been fully used.";
  return null;
}
/** Rupees taken off `price`. Never more than the price, never negative. */
export function discountFor(price: number, c: Pick<CouponLike, "percentOff" | "flatOff">): number {
  const price0 = Math.max(0, Math.floor(price));
  const off = c.percentOff != null ? Math.floor((price0 * c.percentOff) / 100) : (c.flatOff ?? 0);
  return Math.min(price0, Math.max(0, off));
}
export const finalPrice = (price: number, c: Pick<CouponLike, "percentOff" | "flatOff">) => Math.max(0, price) - discountFor(price, c);

export type CouponState = "active" | "scheduled" | "expired" | "exhausted" | "off";
export function couponState(c: CouponLike, now = new Date()): CouponState {
  if (!c.active) return "off";
  if (c.expiresAt && c.expiresAt.getTime() < now.getTime()) return "expired";
  if (c.maxUses != null && c.used >= c.maxUses) return "exhausted";
  if (c.startsAt && c.startsAt.getTime() > now.getTime()) return "scheduled";
  return "active";
}
