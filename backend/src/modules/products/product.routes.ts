// src/modules/products/product.routes.ts
//
// The catalogue. Stock routes (/products/:id/stock, /products/admin/…logs)
// are the inventory module, mounted on the same /products address just
// before this router (see routes.ts).
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { AdminProductQuerySchema, ProductCreateSchema, ProductQuerySchema, ProductUpdateSchema } from "./product.schema";
import * as productController from "./product.controller";

const router = Router();
const id = validate(IdParamSchema, "params");
const canManageProducts = requirePermission("products.manage");

// ── Public (fixed paths before "/:slug", or they would be read as a slug)
router.get("/",        validate(ProductQuerySchema, "query"), productController.list);
router.get("/filters", productController.filters);

// ── Admin
router.get(
  "/admin/all",
  authenticate,
  requirePermission("products.manage", "inventory.manage"),
  validate(AdminProductQuerySchema, "query"),
  productController.listAll
);
router.post("/",      authenticate, canManageProducts, validate(ProductCreateSchema), productController.create);
router.patch("/:id",  authenticate, canManageProducts, id, validate(ProductUpdateSchema), productController.update);
router.delete("/:id", authenticate, canManageProducts, id, productController.archive);

// ── Public
router.get("/:slug", productController.getBySlug);

export default router;
