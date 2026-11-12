// src/modules/products/product.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { AdminProductQuery, ProductQuery } from "./product.schema";
import * as productService from "./product.service";

// ── Public ────────────────────────────────────────────────────────────────────

// GET /api/v1/products
export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(await productService.listProducts(req.query as unknown as ProductQuery));
});

// GET /api/v1/products/filters
export const filters = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await productService.getFacets() });
});

// GET /api/v1/products/:slug
export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  res.json(await productService.getProductBySlug(req.params.slug));
});

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/v1/products/admin/all
export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as AdminProductQuery;
  const { products, total, stats } = await productService.listAllProducts(query);
  res.json({
    success: true,
    data: {
      products,
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      stats,
    },
  });
});

// POST /api/v1/products
export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: { product } });
});

// PATCH /api/v1/products/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: { product } });
});

// DELETE /api/v1/products/:id
export const archive = asyncHandler(async (req: Request, res: Response) => {
  await productService.archiveProduct(req.params.id);
  res.json({ success: true, message: "Product archived" });
});
