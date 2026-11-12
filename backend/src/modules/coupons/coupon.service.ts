// src/modules/coupons/coupon.service.ts
//
// Admin management of coupons. Applying a coupon to an order happens at
// checkout, in the orders module.
import { Coupon, ICoupon } from "../../database/models/Coupon";
import { AppError } from "../../utils/AppError";
import { paginate } from "../../utils/paginate";
import { couponDiscount } from "../orders/order.rules";
import { CouponCreateInput, CouponUpdateInput } from "./coupon.schema";

/**
 * Throws a customer-readable error unless this coupon can be used on an
 * order with this subtotal right now. Checkout (orders module) and the
 * "apply coupon" preview below both use it, so they can never disagree.
 */
export function assertCouponUsable(coupon: ICoupon | null, subtotal: number): asserts coupon is ICoupon {
  if (!coupon || !coupon.isActive) throw new AppError("Invalid coupon code", 400);
  if (coupon.startsAt && coupon.startsAt > new Date()) throw new AppError("This coupon is not active yet", 400);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError("Coupon expired", 400);
  if (subtotal < coupon.minOrderValue) throw new AppError(`Minimum order ₹${coupon.minOrderValue} required`, 400);
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AppError("Coupon usage limit reached", 400);
}

/**
 * What a coupon would take off a cart, without using it up — for the
 * cart's "apply coupon" box. `subtotal` is the item total before GST and
 * shipping. The real check happens again when the order is placed.
 */
export async function previewCoupon(code: string, subtotal: number) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  assertCouponUsable(coupon, subtotal);
  return { code: coupon.code, desc: coupon.desc, type: coupon.type, value: coupon.value, discount: couponDiscount(coupon, subtotal) };
}

/** One page of coupons (newest first) plus the totals shown above the admin list. */
export async function listCoupons(page: number, limit: number) {
  const { skip, take } = paginate(page, limit);

  const [coupons, total, active, usedAgg] = await Promise.all([
    Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Coupon.countDocuments(),
    Coupon.countDocuments({ isActive: true }),
    Coupon.aggregate([{ $group: { _id: null, s: { $sum: "$usedCount" } } }]),
  ]);

  return { coupons, total, stats: { active, totalUsed: (usedAgg[0]?.s as number) || 0 } };
}

/** Codes are stored in capitals, so "diwali10" and "DIWALI10" are the same coupon. */
export async function createCoupon(input: CouponCreateInput) {
  const code = input.code.toUpperCase();

  const existing = await Coupon.findOne({ code });
  if (existing) throw new AppError("Coupon code already exists", 409);

  return Coupon.create({ ...input, code });
}

export async function updateCoupon(id: string, input: CouponUpdateInput) {
  const changes: CouponUpdateInput = input.code ? { ...input, code: input.code.toUpperCase() } : { ...input };

  if (changes.code) {
    const clash = await Coupon.findOne({ code: changes.code, _id: { $ne: id } });
    if (clash) throw new AppError("Coupon code already exists", 409);
  }

  const coupon = await Coupon.findByIdAndUpdate(id, changes, { new: true });
  if (!coupon) throw new AppError("Coupon not found", 404);
  return coupon;
}

export async function deleteCoupon(id: string) {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new AppError("Coupon not found", 404);
}
