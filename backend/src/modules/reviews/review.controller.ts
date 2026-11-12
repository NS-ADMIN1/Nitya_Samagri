// src/modules/reviews/review.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { AdminReviewsQuery } from "./review.schema";
import * as reviewService from "./review.service";

// GET /api/v1/reviews?productId=
export const listForProduct = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.listProductReviews(req.query.productId as string);
  res.json({ success: true, data: { reviews } });
});

// GET /api/v1/reviews/mine
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.listMyReviews(req.user!.userId);
  res.json({ success: true, data: { reviews } });
});

// GET /api/v1/reviews/pending
export const listPending = asyncHandler(async (req: Request, res: Response) => {
  const pending = await reviewService.listPendingReviews(req.user!.userId);
  res.json({ success: true, data: { pending } });
});

// POST /api/v1/reviews
export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.user!.userId, req.body);
  res.status(201).json({ success: true, data: { review } });
});

// PATCH /api/v1/reviews/:id
export const updateMine = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.updateMyReview(req.user!.userId, req.params.id, req.body);
  res.json({ success: true, data: { review } });
});

// DELETE /api/v1/reviews/:id
export const deleteMine = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteMyReview(req.user!.userId, req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

// ── Admin moderation ──────────────────────────────────────────────────────────

// GET /api/v1/reviews/admin/all
export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as AdminReviewsQuery;
  const { reviews, total } = await reviewService.listAllReviews(query);
  res.json({
    success: true,
    data: { reviews, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } },
  });
});

// PATCH /api/v1/reviews/admin/:id
export const setVisibility = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.setReviewVisibility(req.params.id, req.body.isApproved);
  res.json({ success: true, data: { review } });
});

// DELETE /api/v1/reviews/admin/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteReview(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});
