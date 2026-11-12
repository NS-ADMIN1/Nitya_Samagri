// src/modules/inventory/inventory.routes.ts
//
// Stock changes and stock history. Mounted on /products, just before the
// products router (see routes.ts) — these are the addresses the admin
// Inventory page already uses. Anything not matched here falls through to
// the products router.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { ReceiveStockSchema, StockLogsQuerySchema, StockUpdateSchema } from "./inventory.schema";
import * as inventoryController from "./inventory.controller";

const router = Router();
const id = validate(IdParamSchema, "params");
const canManageStock = [authenticate, requirePermission("inventory.manage", "products.manage")];

router.get("/admin/stock-logs", ...canManageStock, validate(StockLogsQuerySchema, "query"), inventoryController.allLogs);
router.post("/admin/receive",   ...canManageStock, validate(ReceiveStockSchema), inventoryController.receive);
router.get("/admin/:id/logs",   ...canManageStock, id, inventoryController.productLogs);
router.patch("/:id/stock",      ...canManageStock, id, validate(StockUpdateSchema), inventoryController.adjust);

export default router;
