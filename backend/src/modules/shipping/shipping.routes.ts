// src/modules/shipping/shipping.routes.ts
//
// Mounted at /integrations/shipping (see routes.ts) — the address the
// storefront and Eshopbox already use.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ShippingCreateSchema, ShippingRatesQuerySchema } from "./shipping.schema";
import * as shippingController from "./shipping.controller";

const router = Router();
const canManageOrders = [authenticate, requirePermission("orders.manage")];

// Called by Eshopbox's servers — authenticated by a shared secret, not a login.
router.post("/webhook", shippingController.webhook);

// Public: delivery charge for a cart
router.get("/rates", validate(ShippingRatesQuerySchema, "query"), shippingController.rates);

// Customer (own orders) and staff
router.get("/track/:orderId", authenticate, shippingController.track);

// Admin
router.post("/create", ...canManageOrders, validate(ShippingCreateSchema), shippingController.create);
router.post("/pickup", ...canManageOrders, shippingController.notApplicable);
router.post("/ndr",    ...canManageOrders, shippingController.notApplicable);

export default router;
