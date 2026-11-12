// src/modules/categories/category.routes.ts
//
// Public reads for the storefront (category row, shop filter, category
// page) and admin create/edit used by the admin product form's picker.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { CategoryCreateSchema, CategoryUpdateSchema } from "./category.schema";
import * as categoryController from "./category.controller";

const router = Router();
const canManageProducts = requirePermission("products.manage");

router.get("/",      categoryController.list);                                                              // public
router.get("/:slug", categoryController.getBySlug);                                                         // public
router.post("/",     authenticate, canManageProducts, validate(CategoryCreateSchema), categoryController.create);
router.patch(
  "/:id",
  authenticate,
  canManageProducts,
  validate(IdParamSchema, "params"),
  validate(CategoryUpdateSchema),
  categoryController.update
);

export default router;
