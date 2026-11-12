// src/modules/coupons/coupon.schema.ts
import { z } from "zod";
import { pageQuery } from "../../utils/validators";

const CouponBaseSchema = z.object({
  code:          z.string().trim().min(3).max(30),
  desc:          z.string().max(200).optional(),
  type:          z.enum(["percent", "flat"]),
  value:         z.number().positive(),
  maxDiscount:   z.number().positive().optional(),
  minOrderValue: z.number().min(0).default(0),
  usageLimit:    z.number().int().positive().optional(),
  isActive:      z.boolean().default(true),
  startsAt:      z.string().datetime().optional(),
  expiresAt:     z.string().datetime().optional(),
});

type CouponFields = Partial<z.infer<typeof CouponBaseSchema>>;

const startsBeforeExpiry = (d: CouponFields) =>
  !d.startsAt || !d.expiresAt || new Date(d.startsAt) < new Date(d.expiresAt);
const dateOrderIssue = { message: "Start date must be before expiry date", path: ["startsAt"] };

// A "percent" coupon can't take more than 100% off.
const percentInRange = (d: CouponFields) => d.type !== "percent" || d.value === undefined || d.value <= 100;
const percentIssue = { message: "A percent coupon can't be more than 100", path: ["value"] };

export const CouponCreateSchema = CouponBaseSchema
  .refine(startsBeforeExpiry, dateOrderIssue)
  .refine(percentInRange, percentIssue);

export const CouponUpdateSchema = CouponBaseSchema.partial()
  .refine(startsBeforeExpiry, dateOrderIssue)
  .refine(percentInRange, percentIssue);

export const CouponPreviewSchema = z.object({
  code:     z.string().trim().min(1).max(30),
  subtotal: z.number().min(0),
});

export const CouponListQuerySchema = z.object(pageQuery());

export type CouponCreateInput = z.infer<typeof CouponCreateSchema>;
export type CouponUpdateInput = z.infer<typeof CouponUpdateSchema>;
export type CouponListQuery   = z.infer<typeof CouponListQuerySchema>;
