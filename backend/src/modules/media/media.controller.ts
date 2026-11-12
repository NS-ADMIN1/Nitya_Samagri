// src/modules/media/media.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as mediaService from "./media.service";

// POST /api/v1/media/upload-url
export const uploadUrl = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: mediaService.createUploadUrl(req.body) });
});
