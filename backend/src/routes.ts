// src/routes.ts
//
// Every API module is mounted here, in one place. app.ts mounts this router
// under /api/v1, so "/orders" below is served at /api/v1/orders.

import { Router } from "express";

import authRoutes         from "./modules/auth/auth.routes";
import customerRoutes     from "./modules/customers/customer.routes";
import addressRoutes      from "./modules/addresses/address.routes";
import productRoutes      from "./modules/products/product.routes";
import inventoryRoutes    from "./modules/inventory/inventory.routes";
import categoryRoutes     from "./modules/categories/category.routes";
import brandRoutes        from "./modules/brands/brand.routes";
import reviewRoutes       from "./modules/reviews/review.routes";
import orderRoutes        from "./modules/orders/order.routes";
import paymentRoutes, { paymentInfoRoutes } from "./modules/payments/payment.routes";
import shippingRoutes     from "./modules/shipping/shipping.routes";
import couponRoutes       from "./modules/coupons/coupon.routes";
import cmsRoutes          from "./modules/cms/cms.routes";
import teamRoutes         from "./modules/team/team.routes";
import settingsRoutes     from "./modules/settings/settings.routes";
import mediaRoutes        from "./modules/media/media.routes";
import systemHealthRoutes from "./modules/health/health.routes";

const router = Router();

router.use("/auth/admin/users", customerRoutes); // before "/auth" — the admin panel's customer list
router.use("/auth",         authRoutes);
router.use("/addresses",    addressRoutes);
router.use("/products",     inventoryRoutes); // stock routes first; the rest falls through to products
router.use("/products",     productRoutes);
router.use("/categories",   categoryRoutes);
router.use("/brands",       brandRoutes);
router.use("/reviews",      reviewRoutes);
router.use("/orders",       orderRoutes);
router.use("/payments",     paymentRoutes);
router.use("/coupons",      couponRoutes);
router.use("/cms",          cmsRoutes);
router.use("/team",         teamRoutes);
router.use("/settings",     settingsRoutes);
router.use("/media",        mediaRoutes);
router.use("/system",       systemHealthRoutes);
router.use("/integrations/shipping", shippingRoutes);
router.use("/integrations/payment",  paymentInfoRoutes);

export default router;
