// src/modules/orders/order.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  AdminOrdersQuerySchema,
  CancelOrderSchema,
  CreateOrderSchema,
  MyOrdersQuerySchema,
  UpdateStatusSchema,
} from "./order.schema";
import * as orderController from "./order.controller";
import * as invoiceController from "../invoices/invoice.controller";

const router = Router();

// Who on the team may do what with orders (permissions: config/permissions.ts).
// By default Warehouse and Support hold "orders.view" only — they can read
// orders but not change them.
const canViewOrders   = requirePermission("orders.view", "orders.manage");
const canUpdateOrders = requirePermission("orders.manage");
const canSeeStats     = requirePermission("reports.view");

router.use(authenticate);

// ── Admin (registered before "/:orderId" so "admin" is never read as an order ID)
router.get("/admin/all",   canViewOrders, validate(AdminOrdersQuerySchema, "query"), orderController.listAll);
router.get("/admin/stats", canSeeStats, orderController.stats);
router.patch("/:orderId/status", canUpdateOrders, validate(UpdateStatusSchema), orderController.changeStatus);

// ── Customer
router.post("/", validate(CreateOrderSchema), orderController.create);
router.get("/",  validate(MyOrdersQuerySchema, "query"), orderController.listMine);
router.get("/:orderId", orderController.getOne);
router.get("/:orderId/invoice", invoiceController.get); // own orders for customers, any order for staff
router.post("/:orderId/cancel", validate(CancelOrderSchema), orderController.cancel);

export default router;
