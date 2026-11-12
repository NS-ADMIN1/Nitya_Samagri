// src/modules/brands/brand.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as brandService from "./brand.service";

// GET /api/v1/brands
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const items = await brandService.listActiveBrands();
  res.json({ success: true, data: { items } });
});

// POST /api/v1/brands
export const create = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.createBrand(req.body);
  res.status(201).json({ success: true, data: { brand } });
});
