// src/modules/cms/cms.routes.ts
//
// Storefront content: banners, festivals, blogs, sections, announcements, seo-pages.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { optionalAuth } from "../../middlewares/optionalAuth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { CmsItemParamsSchema } from "./cms.schema";
import * as cmsController from "./cms.controller";

const router = Router();
const canManageStore = [authenticate, requirePermission("store.manage")];

// Storefront — registered before "/:resource" so "festivals-public" is not read as a resource
router.get("/festivals-public",       cmsController.publicFestivals);
router.get("/festivals-public/:slug", cmsController.publicFestival);

// Public read: customers get live items only, signed-in staff get everything
router.get("/:resource", optionalAuth, cmsController.list);

// Admin
router.post("/:resource",       ...canManageStore, cmsController.create);
router.patch("/:resource/:id",  ...canManageStore, validate(CmsItemParamsSchema, "params"), cmsController.update);
router.delete("/:resource/:id", ...canManageStore, validate(CmsItemParamsSchema, "params"), cmsController.remove);

export default router;
