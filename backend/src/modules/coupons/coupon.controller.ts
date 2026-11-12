// src/modules/coupons/coupon.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { CouponListQuery } from "./coupon.schema";
import * as couponService from "./coupon.service";

// POST /api/v1/coupons/validate
export const preview = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.previewCoupon(req.body.code, req.body.subtotal);
  res.json({ success: true, data: { coupon } });
});

// GET /api/v1/coupons?page=&limit=
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as CouponListQuery;
  const { coupons, stats, total } = await couponService.listCoupons(page, limit);
  res.json({
    success: true,
    data: { coupons, stats, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

// POST /api/v1/coupons
export const create = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.createCoupon(req.body);
  res.status(201).json({ success: true, data: { coupon } });
});

// PATCH /api/v1/coupons/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.body);
  res.json({ success: true, data: { coupon } });
});

// DELETE /api/v1/coupons/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await couponService.deleteCoupon(req.params.id);
  res.json({ success: true, message: "Coupon deleted" });
});
