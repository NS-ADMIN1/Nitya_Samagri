// src/modules/categories/category.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as categoryService from "./category.service";

// GET /api/v1/categories
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const items = await categoryService.listActiveCategories();
  res.json({ success: true, data: { items } });
});

// GET /api/v1/categories/:slug
export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.getActiveCategoryBySlug(req.params.slug);
  res.json({ success: true, data: { category } });
});

// POST /api/v1/categories
export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: { category } });
});

// PATCH /api/v1/categories/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.json({ success: true, data: { category } });
});
