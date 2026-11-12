// src/modules/settings/settings.routes.ts
//
// Store-wide settings — the admin "Settings" page.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { SettingsUpdateSchema } from "./settings.schema";
import * as settingsController from "./settings.controller";

const router = Router();

router.get("/public", settingsController.getPublic); // store name + support contact, for the storefront

router.get("/",   authenticate, requirePermission("settings.manage"), settingsController.get);
router.patch("/", authenticate, requirePermission("settings.manage"), validate(SettingsUpdateSchema), settingsController.update);

export default router;
