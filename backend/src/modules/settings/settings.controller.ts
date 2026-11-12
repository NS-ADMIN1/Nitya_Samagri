// src/modules/settings/settings.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as settingsService from "./settings.service";

// GET /api/v1/settings/public
export const getPublic = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.getPublicSettings();
  res.json({ success: true, data: { settings } });
});

// GET /api/v1/settings
export const get = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingsService.getSettings();
  res.json({ success: true, data: { settings } });
});

// PATCH /api/v1/settings
export const update = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.body);
  res.json({ success: true, data: { settings } });
});
