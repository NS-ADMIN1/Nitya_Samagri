// src/modules/reviews/review.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import {
  AdminReviewsQuerySchema,
  ProductReviewsQuerySchema,
  ReviewCreateSchema,
  ReviewUpdateSchema,
  ReviewVisibilitySchema,
} from "./review.schema";
import * as reviewController from "./review.controller";

const router = Router();
const id = validate(IdParamSchema, "params");
const canModerate = requirePermission("products.manage");

// Public: the reviews shown on a product page
router.get("/", validate(ProductReviewsQuerySchema, "query"), reviewController.listForProduct);

router.use(authenticate);

// Admin moderation (before "/:id" so "admin" is never read as a review ID)
router.get("/admin/all",    canModerate, validate(AdminReviewsQuerySchema, "query"), reviewController.listAll);
router.patch("/admin/:id",  canModerate, id, validate(ReviewVisibilitySchema), reviewController.setVisibility);
router.delete("/admin/:id", canModerate, id, reviewController.remove);

// Customer: their own reviews
router.get("/mine",    reviewController.listMine);
router.get("/pending", reviewController.listPending);
router.post("/",       validate(ReviewCreateSchema), reviewController.create);
router.patch("/:id",   id, validate(ReviewUpdateSchema), reviewController.updateMine);
router.delete("/:id",  id, reviewController.deleteMine);

export default router;
