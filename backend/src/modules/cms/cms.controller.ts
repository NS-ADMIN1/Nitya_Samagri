// src/modules/cms/cms.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as cmsService from "./cms.service";

// GET /api/v1/cms/festivals-public
export const publicFestivals = asyncHandler(async (_req: Request, res: Response) => {
  const items = await cmsService.listPublicFestivals();
  res.json({ success: true, data: { items } });
});

// GET /api/v1/cms/festivals-public/:slug
export const publicFestival = asyncHandler(async (req: Request, res: Response) => {
  const item = await cmsService.getPublicFestival(req.params.slug);
  res.json({ success: true, data: { item } });
});

// GET /api/v1/cms/:resource
export const list = asyncHandler(async (req: Request, res: Response) => {
  const isStaff = !!req.user && req.user.role !== "customer";
  const items = await cmsService.listItems(req.params.resource, isStaff);
  res.json({ success: true, data: { items } });
});

// POST /api/v1/cms/:resource
export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await cmsService.createItem(req.params.resource, req.body);
  res.status(201).json({ success: true, data: { item } });
});

// PATCH /api/v1/cms/:resource/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await cmsService.updateItem(req.params.resource, req.params.id, req.body);
  res.json({ success: true, data: { item } });
});

// DELETE /api/v1/cms/:resource/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await cmsService.deleteItem(req.params.resource, req.params.id);
  res.json({ success: true, message: "Deleted" });
});
