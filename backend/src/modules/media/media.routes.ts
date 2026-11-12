// src/modules/media/media.routes.ts
//
// Photo uploads to AWS S3 — for staff who manage products or store content.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { UploadUrlSchema } from "./media.schema";
import * as mediaController from "./media.controller";

const router = Router();

router.post(
  "/upload-url",
  authenticate,
  requirePermission("products.manage", "store.manage"),
  validate(UploadUrlSchema),
  mediaController.uploadUrl
);

export default router;
