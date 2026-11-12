// src/modules/customers/customer.routes.ts
//
// Admin view of customers. Mounted at /auth/admin/users (see routes.ts) —
// the address the admin panel already uses.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { CustomerListQuerySchema, CustomerStatusSchema } from "./customer.schema";
import * as customerController from "./customer.controller";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("users.view", "users.manage"), validate(CustomerListQuerySchema, "query"), customerController.list);
router.patch(
  "/:id/status",
  requirePermission("users.manage"),
  validate(IdParamSchema, "params"),
  validate(CustomerStatusSchema),
  customerController.setStatus
);

export default router;
