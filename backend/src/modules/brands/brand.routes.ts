// src/modules/brands/brand.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { BrandCreateSchema } from "./brand.schema";
import * as brandController from "./brand.controller";

const router = Router();

router.get("/", brandController.list);                                                              // public
router.post("/", authenticate, requirePermission("products.manage"), validate(BrandCreateSchema), brandController.create);

export default router;
