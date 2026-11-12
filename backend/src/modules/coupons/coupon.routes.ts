// src/modules/coupons/coupon.routes.ts
//
// Coupon check for customers, and coupon management for staff.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { CouponCreateSchema, CouponListQuerySchema, CouponPreviewSchema, CouponUpdateSchema } from "./coupon.schema";
import * as couponController from "./coupon.controller";

const router = Router();

// Customer: check a code against the cart before placing the order
router.post("/validate", authenticate, validate(CouponPreviewSchema), couponController.preview);

// Everything below: staff with the "coupons.manage" permission
router.use(authenticate, requirePermission("coupons.manage"));

router.get("/",       validate(CouponListQuerySchema, "query"), couponController.list);
router.post("/",      validate(CouponCreateSchema), couponController.create);
router.patch("/:id",  validate(IdParamSchema, "params"), validate(CouponUpdateSchema), couponController.update);
router.delete("/:id", validate(IdParamSchema, "params"), couponController.remove);

export default router;
