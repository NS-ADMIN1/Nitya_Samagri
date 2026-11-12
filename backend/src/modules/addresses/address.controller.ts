// src/modules/addresses/address.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as addressService from "./address.service";

// GET /api/v1/addresses
export const list = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await addressService.listAddresses(req.user!.userId);
  res.json({ success: true, data: { addresses } });
});

// GET /api/v1/addresses/:id
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressService.getAddress(req.user!.userId, req.params.id);
  res.json({ success: true, data: { address } });
});

// POST /api/v1/addresses
export const create = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressService.createAddress(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: { address } });
});

// PATCH /api/v1/addresses/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const address = await addressService.updateAddress(req.user!.userId, req.params.id, req.body);
  res.json({ success: true, data: { address } });
});

// DELETE /api/v1/addresses/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await addressService.deleteAddress(req.user!.userId, req.params.id);
  res.json({ success: true, data: { deleted: true } });
});
