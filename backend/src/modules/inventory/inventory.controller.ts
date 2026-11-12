// src/modules/inventory/inventory.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { StockLogsQuery } from "./inventory.schema";
import * as inventoryService from "./inventory.service";

// PATCH /api/v1/products/:id/stock
export const adjust = asyncHandler(async (req: Request, res: Response) => {
  const stock = await inventoryService.adjustStock(req.params.id, req.body, req.user!.userId);
  res.json({ success: true, data: { stock } });
});

// POST /api/v1/products/admin/receive
export const receive = asyncHandler(async (req: Request, res: Response) => {
  const data = await inventoryService.receiveStock(req.body, req.user!.userId);
  res.status(201).json({ success: true, data });
});

// GET /api/v1/products/admin/:id/logs
export const productLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await inventoryService.listProductLogs(req.params.id);
  res.json({ success: true, data: { logs } });
});

// GET /api/v1/products/admin/stock-logs
export const allLogs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as StockLogsQuery;
  const { logs, total } = await inventoryService.listStockLogs(query);
  res.json({
    success: true,
    data: { logs, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } },
  });
});
