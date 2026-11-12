// src/modules/reviews/review.service.ts
//
// Product reviews: customers write, edit and delete their own; the team
// can hide or remove any. A new review is shown straight away (there is no
// approval queue) — the team hides one afterwards if it has to.
import { Review } from "../../database/models/Review";
import { Order } from "../../database/models/Order";
import { OrderItem } from "../../database/models/OrderItem";
import { clearProductCache } from "../../cache/product.cache";
import { AppError } from "../../utils/AppError";
import { paginate } from "../../utils/paginate";
import { AdminReviewsQuery, ReviewCreateInput, ReviewUpdateInput } from "./review.schema";

/** The product page shows reviews and the rating, so its cache is dropped when a review changes. */
async function refreshProductPage(productId: unknown) {
  if (productId) await clearProductCache([String(productId)]);
}

/** Has this customer received this product in a delivered order? */
async function hasBought(userId: string, productId: string): Promise<boolean> {
  const deliveredOrderIds = await Order.find({ userId, status: "delivered" }).distinct("_id");
  if (deliveredOrderIds.length === 0) return false;
  return !!(await OrderItem.exists({ productId, orderId: { $in: deliveredOrderIds } }));
}

// ── Public ────────────────────────────────────────────────────────────────────

/** Reviews shown on a product page. */
export function listProductReviews(productId: string) {
  return Review.find({ productId, isApproved: true }).sort({ createdAt: -1 }).populate("userId", "name").lean();
}

// ── Customer ──────────────────────────────────────────────────────────────────

/** The customer's own reviews, shown or hidden. */
export function listMyReviews(userId: string) {
  return Review.find({ userId }).sort({ createdAt: -1 }).populate("productId", "name slug").lean();
}

/** Delivered products the customer has not reviewed yet — the "Pending" tab. */
export async function listPendingReviews(userId: string) {
  const deliveredOrders = await Order.find({ userId, status: "delivered" }).select("_id orderId updatedAt").lean();
  const orderById = new Map(deliveredOrders.map((o) => [String(o._id), o]));

  const [items, reviewed] = await Promise.all([
    OrderItem.find({ orderId: { $in: deliveredOrders.map((o) => o._id) } }).populate("productId", "name slug").lean(),
    Review.find({ userId, productId: { $ne: null } }).select("productId").lean(),
  ]);
  const reviewedIds = new Set(reviewed.map((r) => String(r.productId)));

  const pending = [];
  const seen = new Set<string>();
  for (const item of items) {
    const product = item.productId as unknown as { _id: unknown; slug: string } | null;
    if (!product) continue; // the product was deleted
    const key = String(product._id);
    if (reviewedIds.has(key) || seen.has(key)) continue;
    seen.add(key);

    const order = orderById.get(String(item.orderId));
    pending.push({
      productId:   product._id,
      productSlug: product.slug,
      name:        item.productName,
      orderId:     order?.orderId,
      deliveredOn: order?.updatedAt,
    });
  }
  return pending;
}

/** One review per customer per product. Marked "verified purchase" when they received it. */
export async function createReview(userId: string, input: ReviewCreateInput) {
  if (await Review.exists({ userId, productId: input.productId })) {
    throw new AppError("You've already reviewed this product", 409);
  }

  const review = await Review.create({
    ...input,
    userId,
    isVerifiedPurchase: await hasBought(userId, input.productId),
    isApproved: true,
  });

  await refreshProductPage(input.productId);
  return review;
}

export async function updateMyReview(userId: string, id: string, input: ReviewUpdateInput) {
  const review = await Review.findOne({ _id: id, userId });
  if (!review) throw new AppError("Review not found", 404);

  Object.assign(review, input);
  await review.save();

  await refreshProductPage(review.productId);
  return review;
}

export async function deleteMyReview(userId: string, id: string) {
  const review = await Review.findOne({ _id: id, userId });
  if (!review) throw new AppError("Review not found", 404);

  await review.deleteOne();
  await refreshProductPage(review.productId);
}

// ── Admin moderation ──────────────────────────────────────────────────────────

export async function listAllReviews(query: AdminReviewsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status === "shown") filter.isApproved = true;
  if (query.status === "hidden") filter.isApproved = false;
  if (query.productId) filter.productId = query.productId;

  const { skip, take } = paginate(query.page, query.limit);
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .populate("userId", "name phone")
      .populate("productId", "name slug")
      .lean(),
    Review.countDocuments(filter),
  ]);

  return { reviews, total };
}

/** Show or hide a review on the product page. */
export async function setReviewVisibility(id: string, isApproved: boolean) {
  const review = await Review.findByIdAndUpdate(id, { isApproved }, { new: true });
  if (!review) throw new AppError("Review not found", 404);

  await refreshProductPage(review.productId);
  return review;
}

export async function deleteReview(id: string) {
  const review = await Review.findByIdAndDelete(id);
  if (!review) throw new AppError("Review not found", 404);
  await refreshProductPage(review.productId);
}
