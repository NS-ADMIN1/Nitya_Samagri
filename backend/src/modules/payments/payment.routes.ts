// src/modules/payments/payment.routes.ts
//
// Razorpay checkout, webhook and refunds.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { CreatePaymentOrderSchema, RefundSchema, VerifyPaymentSchema } from "./payment.schema";
import * as paymentController from "./payment.controller";

const router = Router();

// Called by Razorpay's servers — authenticated by its signature, not a login.
router.post("/webhook", paymentController.webhook);

// Customer
router.post("/create-order", authenticate, validate(CreatePaymentOrderSchema), paymentController.createOrder);
router.post("/verify",       authenticate, validate(VerifyPaymentSchema), paymentController.verify);
router.get("/history",       authenticate, paymentController.history);

// Admin
router.post("/refund", authenticate, requirePermission("orders.manage"), validate(RefundSchema), paymentController.refund);

export default router;

// ── Checkout helpers, served at /integrations/payment (see routes.ts) ─────────
export const paymentInfoRoutes = Router();
paymentInfoRoutes.get("/config/:orderId",   authenticate, paymentController.checkoutConfig);
paymentInfoRoutes.get("/status/:paymentId", authenticate, paymentController.paymentStatus);
