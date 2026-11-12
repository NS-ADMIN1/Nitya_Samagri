// src/modules/reviews/review.schema.ts
import { z } from "zod";
import { objectId, pageQuery } from "../../utils/validators";

export const ReviewCreateSchema = z.object({
  productId: objectId(),
  rating:    z.number().int().min(1).max(5),
  title:     z.string().max(120).optional(),
  comment:   z.string().max(2000).optional(),
});

export const ReviewUpdateSchema = z.object({
  rating:  z.number().int().min(1).max(5).optional(),
  title:   z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
});

export const ProductReviewsQuerySchema = z.object({
  productId: objectId(),
});

// Admin moderation
export const AdminReviewsQuerySchema = z.object({
  ...pageQuery(100, 20),
  status:    z.enum(["all", "shown", "hidden"]).default("all"),
  productId: objectId().optional(),
});

export const ReviewVisibilitySchema = z.object({
  isApproved: z.boolean(), // true = shown on the product page, false = hidden
});

export type ReviewCreateInput  = z.infer<typeof ReviewCreateSchema>;
export type ReviewUpdateInput  = z.infer<typeof ReviewUpdateSchema>;
export type AdminReviewsQuery  = z.infer<typeof AdminReviewsQuerySchema>;
