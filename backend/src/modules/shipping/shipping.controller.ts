// src/modules/shipping/shipping.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { AppError } from "../../utils/AppError";
import { ShippingRatesQuery } from "./shipping.schema";
import * as shippingService from "./shipping.service";

// GET /api/v1/integrations/shipping/rates?pincode=&orderValue=
export const rates = asyncHandler(async (req: Request, res: Response) => {
  const data = await shippingService.getShippingRate(req.query as unknown as ShippingRatesQuery);
  res.json({ success: true, data });
});

// GET /api/v1/integrations/shipping/track/:orderId
export const track = asyncHandler(async (req: Request, res: Response) => {
  const tracking = await shippingService.trackOrder(req.params.orderId, req.user!);
  res.json({ success: true, data: { tracking } });
});

// POST /api/v1/integrations/shipping/create
export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = await shippingService.handOffToEshopbox(req.body.orderId);
  res.json({ success: true, data });
});

// POST /api/v1/integrations/shipping/pickup, /ndr — kept so old callers get a clear answer instead of a 404
export const notApplicable = asyncHandler(async () => {
  throw new AppError("This is handled internally by Eshopbox — this endpoint is not applicable", 501);
});

// POST /api/v1/integrations/shipping/webhook
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const secret = (req.query.secret as string) || (req.headers["x-webhook-secret"] as string) || "";
  await shippingService.handleEshopboxWebhook(req.body || {}, secret, req.ip || "");
  res.json({ status: "ok" });
});
