// src/modules/payments/payment.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as paymentService from "./payment.service";

// POST /api/v1/payments/create-order
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.createPaymentOrder(req.user!.userId, req.body.orderId);
  res.json({ success: true, data });
});

// POST /api/v1/payments/verify
export const verify = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, alreadyVerified } = await paymentService.confirmCheckoutPayment(req.user!.userId, req.body);
  res.json({
    success: true,
    message: alreadyVerified ? "Payment already verified" : "Payment verified successfully",
    data: { orderId },
  });
});

// POST /api/v1/payments/webhook — the body is RAW here (configured in app.ts)
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  await paymentService.handleRazorpayWebhook(req.body as Buffer, req.headers["x-razorpay-signature"] as string | undefined);
  res.json({ status: "ok" });
});

// POST /api/v1/payments/refund
export const refund = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.refundOrder(req.body);
  res.json({ success: true, data });
});

// GET /api/v1/integrations/payment/config/:orderId
export const checkoutConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await paymentService.getCheckoutConfig(req.user!.userId, req.params.orderId);
  res.json({ success: true, data: { config } });
});

// GET /api/v1/integrations/payment/status/:paymentId
export const paymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.getPaymentStatus(req.params.paymentId, req.user!);
  res.json({ success: true, data });
});

// GET /api/v1/payments/history
export const history = asyncHandler(async (req: Request, res: Response) => {
  const payments = await paymentService.listMyPayments(req.user!.userId);
  res.json({ success: true, data: { payments } });
});
