// src/modules/orders/order.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { AdminOrdersQuery, MyOrdersQuery } from "./order.schema";
import * as orderService from "./order.service";

const pagination = (page: number, limit: number, total: number) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// ── Customer ──────────────────────────────────────────────────────────────────

// POST /api/v1/orders
export const create = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: { order } });
});

// GET /api/v1/orders
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MyOrdersQuery;
  const { orders, total } = await orderService.listMyOrders(req.user!.userId, query);
  res.json({ success: true, data: { orders, pagination: pagination(query.page, query.limit, total) } });
});

// GET /api/v1/orders/:orderId
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrder(req.params.orderId, req.user!);
  res.json({ success: true, data: { order } });
});

// POST /api/v1/orders/:orderId/cancel
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const { refund } = await orderService.cancelMyOrder(req.user!.userId, req.params.orderId, req.body?.reason);
  // refund: "none" (nothing was paid online) | "started" | "failed" (the team will refund by hand)
  res.json({ success: true, message: "Order cancelled successfully", data: { refund } });
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/v1/orders/admin/all
export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as AdminOrdersQuery;
  const { orders, total } = await orderService.listAllOrders(query);
  res.json({ success: true, data: { orders, pagination: pagination(query.page, query.limit, total) } });
});

// GET /api/v1/orders/admin/stats
export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await orderService.getOrderStats();
  res.json({ success: true, data });
});

// PATCH /api/v1/orders/:orderId/status
export const changeStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.changeOrderStatus(req.params.orderId, req.body);
  res.json({ success: true, data: { order } });
});
