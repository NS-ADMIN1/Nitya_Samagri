// src/modules/orders/order.service.ts
//
// Placing, reading, cancelling and moving orders through their statuses.
// Plain rules (totals, which status may follow which) are in order.rules.ts;
// stock and coupon holds are in order.stock.ts; money is in the payments module.
import crypto from "crypto";
import mongoose, { ClientSession, Types } from "mongoose";
import { Order, IOrder } from "../../database/models/Order";
import { OrderItem, IOrderItem } from "../../database/models/OrderItem";
import { OrderTimeline } from "../../database/models/OrderTimeline";
import { Address } from "../../database/models/Address";
import { Product } from "../../database/models/Product";
import { ProductVariant } from "../../database/models/ProductVariant";
import { Coupon } from "../../database/models/Coupon";
import { User } from "../../database/models/User";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { paginate } from "../../utils/paginate";
import { escapeRegex } from "../../utils/escapeRegex";
import { notifyOrderPlaced, notifyStatusChanged } from "../../notifications/order.notifications";
import { refundAutomatically } from "../payments/payment.service";
import {
  BEFORE_SHIPPING,
  DEFAULT_GST_PCT,
  ORDER_STAFF_ROLES,
  ORDER_STATUS_LABELS,
  canChangeStatus,
  couponDiscount,
  orderTotals,
} from "./order.rules";
import { clearProductCache } from "../../cache/product.cache";
import { assertCouponUsable } from "../coupons/coupon.service";
import { releaseOrderHolds, reserveStock } from "./order.stock";
import { AdminOrdersQuery, CreateOrderInput, MyOrdersQuery, UpdateStatusInput } from "./order.schema";

type OrderStatus = IOrder["status"];

const UNPAID = ["pending", "failed"];
const MAX_ORDER_ID_ATTEMPTS = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** e.g. ORD-2026-48213057 — eight random digits, so IDs can't be guessed in sequence. */
function generateOrderId(): string {
  return `ORD-${new Date().getFullYear()}-${crypto.randomInt(10_000_000, 100_000_000)}`;
}

function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

function label(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

/** Attach each order's line items, with one query for the whole page. */
async function withItems<T extends { _id: unknown }>(orders: T[]) {
  const items = await OrderItem.find({ orderId: { $in: orders.map((o) => o._id) } }).lean();

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const key = String(item.orderId);
    if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
    itemsByOrder.get(key)!.push(item);
  }
  return orders.map((o) => ({ ...o, items: itemsByOrder.get(String(o._id)) || [] }));
}

/** Check a coupon can be used on this order and work out what it takes off. */
async function checkCoupon(code: string, subtotal: number, session: ClientSession) {
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() }).session(session);
  assertCouponUsable(coupon, subtotal);

  return { couponId: coupon!._id as Types.ObjectId, discount: couponDiscount(coupon!, subtotal) };
}

/**
 * Count one use of the coupon. The usage limit is checked inside the update
 * itself, so two orders at the same moment cannot both take the last use.
 */
async function claimCoupon(couponId: Types.ObjectId, session: ClientSession) {
  const claimed = await Coupon.updateOne(
    {
      _id: couponId,
      $or: [
        { usageLimit: { $exists: false } },
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { session }
  );
  if (claimed.modifiedCount === 0) throw new AppError("Coupon usage limit reached", 400);
}

// ── Placing an order ──────────────────────────────────────────────────────────

export async function createOrder(userId: string, input: CreateOrderInput) {
  const address = await Address.findOne({ _id: input.addressId, userId });
  if (!address) throw new AppError("Address not found", 404);

  const products = await Product.find({ _id: { $in: input.items.map((i) => i.productId) } });
  const variantIds = input.items.map((i) => i.variantId).filter(Boolean) as string[];
  const variants = variantIds.length ? await ProductVariant.find({ _id: { $in: variantIds } }) : [];

  // Prices always come from the database, never from the request.
  const lines = input.items.map((item) => {
    const product = products.find((p) => String(p._id) === item.productId);
    if (!product) throw new AppError(`Product ${item.productId} not found`, 404);
    if (product.status !== "active") throw new AppError(`${product.name} is not available for purchase`, 400);

    const gstPct = product.gstPct ?? DEFAULT_GST_PCT;

    if (item.variantId) {
      const variant = variants.find(
        (v) => String(v._id) === item.variantId && String(v.productId) === item.productId && v.isActive
      );
      if (!variant) throw new AppError(`Variant not found for ${product.name}`, 404);
      if (variant.stock < item.qty) throw new AppError(`Insufficient stock for ${product.name} (${variant.label})`, 400);
      return { ...item, product, price: variant.price, gstPct };
    }

    if (product.stock < item.qty) throw new AppError(`Insufficient stock for ${product.name}`, 400);
    return { ...item, product, price: product.price, gstPct };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const placed: { order?: IOrder; items: IOrderItem[] } = { items: [] };

  // The order ID is random; on the rare clash with an existing one, try again.
  for (let attempt = 1; attempt <= MAX_ORDER_ID_ATTEMPTS; attempt++) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        let discount = 0;
        let couponId: Types.ObjectId | undefined;
        if (input.couponCode) {
          ({ couponId, discount } = await checkCoupon(input.couponCode, subtotal, session));
        }
        const totals  = orderTotals(lines, discount);
        const orderId = generateOrderId();

        await reserveStock(
          lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty, name: l.product.name })),
          session,
          orderId
        );
        if (couponId) await claimCoupon(couponId, session);

        const [order] = await Order.create(
          [
            {
              orderId,
              userId,
              addressId: input.addressId,
              address: {
                name:  address.fullName,
                line1: address.line1,
                line2: address.line2,
                city:  address.city,
                state: address.state,
                pin:   address.pincode,
              },
              status:        "pending",
              paymentMethod: input.paymentMethod,
              paymentStatus: "pending",
              ...totals,
              couponId,
              deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : undefined,
              deliverySlot: input.deliverySlot,
              notes:        input.notes,
            },
          ],
          { session }
        );

        placed.order = order;
        // insertMany writes every line in one operation, which is what a transaction needs
        placed.items = (await OrderItem.insertMany(
          lines.map((l) => ({
            orderId:     order._id,
            productId:   l.productId,
            variantId:   l.variantId,
            productName: l.product.name,
            sku:         l.product.sku,
            qty:         l.qty,
            price:       l.price,
            total:       l.price * l.qty,
            gstPct:      l.gstPct,
          })),
          { session }
        )) as unknown as IOrderItem[];
      });
      await session.endSession();
      break;
    } catch (err) {
      await session.endSession();
      if (!isDuplicateKey(err) || attempt === MAX_ORDER_ID_ATTEMPTS) throw err;
    }
  }

  const order = placed.order;
  if (!order) throw new AppError("Failed to create order — please try again", 500);

  await clearProductCache(lines.map((l) => l.productId));
  notifyOrderPlaced(order, placed.items);

  return { ...order.toObject(), items: placed.items };
}

// ── Reading orders ────────────────────────────────────────────────────────────

export async function listMyOrders(userId: string, query: MyOrdersQuery) {
  const filter: Record<string, unknown> = { userId };
  if (query.status) filter.status = query.status;

  const { skip, take } = paginate(query.page, query.limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Order.countDocuments(filter),
  ]);

  return { orders: await withItems(orders), total };
}

/** One order with its items and timeline. Customers can only open their own. */
export async function getOrder(orderId: string, viewer: { userId: string; role: string }) {
  const filter: Record<string, unknown> = { orderId };
  if (!ORDER_STAFF_ROLES.includes(viewer.role)) filter.userId = viewer.userId;

  const order = await Order.findOne(filter).populate("couponId", "code type value").populate("addressId").lean();
  if (!order) throw new AppError("Order not found", 404);

  const [items, timeline] = await Promise.all([
    OrderItem.find({ orderId: order._id }).populate("productId").populate("variantId").lean(),
    OrderTimeline.find({ orderId: order._id }).sort({ createdAt: 1 }).lean(),
  ]);

  return { ...order, items, timeline };
}

/** Admin list: every customer's orders, with search and filters. */
export async function listAllOrders(query: AdminOrdersQuery) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.payment) filter.paymentMethod = query.payment;
  if (query.q) {
    // Orders only store the customer's ID, so find matching customers first.
    const text = escapeRegex(query.q.trim());
    const matchingUsers = await User.find({
      $or: [{ name: { $regex: text, $options: "i" } }, { phone: { $regex: text } }],
    }).select("_id");
    filter.$or = [{ orderId: { $regex: text, $options: "i" } }, { userId: { $in: matchingUsers.map((u) => u._id) } }];
  }
  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) createdAt.$lte = new Date(query.dateTo);
    filter.createdAt = createdAt;
  }

  const { skip, take } = paginate(query.page, query.limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).populate("userId", "name phone").sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Order.countDocuments(filter),
  ]);

  return { orders: await withItems(orders), total };
}

// ── Cancelling ────────────────────────────────────────────────────────────────

type RefundOutcome = "none" | "started" | "failed";

/**
 * Cancel an order and settle everything that follows from it:
 *   1. in one transaction: stock and coupon go back, status → cancelled, timeline
 *   2. if it was paid online, the money is refunded automatically
 *
 * `stillAllowed` is re-checked inside the transaction on a fresh copy of the
 * order, so an order that changed in the meantime (paid, shipped, already
 * cancelled) is left alone — the function then returns null.
 */
async function cancelAndSettle(
  orderDbId: Types.ObjectId,
  note: string,
  options: { stillAllowed?: (order: IOrder) => boolean; email?: boolean } = {}
): Promise<{ refund: RefundOutcome } | null> {
  const result: { order?: IOrder; restocked: Types.ObjectId[] } = { restocked: [] };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      result.order = undefined;

      const order = await Order.findById(orderDbId).session(session);
      if (!order || !canChangeStatus(order.status, "cancelled")) return;
      if (options.stillAllowed && !options.stillAllowed(order)) return;

      result.restocked = await releaseOrderHolds(order, session, { releaseCoupon: true });
      order.status = "cancelled";
      await order.save({ session });
      await OrderTimeline.create([{ orderId: order._id, status: "cancelled", note }], { session });

      result.order = order;
    });
  } finally {
    await session.endSession();
  }

  const order = result.order;
  if (!order) return null;

  await clearProductCache(result.restocked);
  notifyStatusChanged(order, { email: options.email });

  const paidOnline = ["paid", "partially_refunded"].includes(order.paymentStatus) && !!order.razorpayPaymentId;
  if (!paidOnline) return { refund: "none" };

  const started = await refundAutomatically(order.orderId, "Order cancelled");
  return { refund: started ? "started" : "failed" };
}

/** POST /orders/:orderId/cancel — a customer cancels their own order. */
export async function cancelMyOrder(userId: string, orderId: string, reason?: string) {
  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "cancelled") throw new AppError("Order already cancelled", 400);
  if (!BEFORE_SHIPPING.includes(order.status)) {
    throw new AppError(
      ["shipped", "out_for_delivery", "NDR", "delivered"].includes(order.status)
        ? "Cannot cancel order after it has been shipped"
        : "This order can no longer be cancelled",
      400
    );
  }

  const done = await cancelAndSettle(order._id as Types.ObjectId, reason || "Cancelled by customer");
  if (!done) throw new AppError("This order can no longer be cancelled", 409);
  return done;
}

/**
 * Cancel online-payment orders that were never paid, releasing their stock
 * and coupon. Run on a timer by jobs/unpaidOrders.job.ts. Returns how many
 * were cancelled.
 */
export async function cancelUnpaidOrders(): Promise<number> {
  const minutes = env.UNPAID_ORDER_MINUTES;
  const isStillUnpaid = (o: Pick<IOrder, "status" | "paymentStatus" | "paymentMethod">) =>
    o.status === "pending" && UNPAID.includes(o.paymentStatus) && o.paymentMethod !== "cod";

  const stale = await Order.find({
    status:        "pending",
    paymentStatus: { $in: UNPAID },
    paymentMethod: { $ne: "cod" },
    createdAt:     { $lt: new Date(Date.now() - minutes * 60_000) },
  })
    .select("_id orderId")
    .limit(200)
    .lean();

  let cancelled = 0;
  for (const order of stale) {
    try {
      const done = await cancelAndSettle(
        order._id as Types.ObjectId,
        `Cancelled automatically — not paid within ${minutes} minutes`,
        { stillAllowed: isStillUnpaid, email: false }
      );
      if (done) cancelled++;
    } catch (err) {
      logger.error(`Could not cancel unpaid order ${order.orderId}`, { err });
    }
  }
  return cancelled;
}

// ── Changing status ───────────────────────────────────────────────────────────

interface StatusChange {
  status:       OrderStatus;
  trackingNo?:  string;
  courierName?: string;
  note?:        string;
}

/**
 * Move an order to a new status (anything except "cancelled", which is
 * cancelAndSettle's job) and apply what that status means:
 *   returned  → items go back into stock
 *   delivered → a cash-on-delivery order becomes paid
 *   refunded  → (set by hand, for money returned outside Razorpay) payment marked refunded
 */
async function applyStatus(orderDbId: Types.ObjectId, change: StatusChange, location?: string): Promise<IOrder> {
  const result: { order?: IOrder; restocked: Types.ObjectId[] } = { restocked: [] };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderDbId).session(session);
      if (!order) throw new AppError("Order not found", 404);
      if (!canChangeStatus(order.status, change.status)) {
        throw new AppError(`An order that is ${label(order.status)} can't be changed to ${label(change.status)}`, 409);
      }

      result.restocked = [];
      if (change.status === "returned") {
        result.restocked = await releaseOrderHolds(order, session, { releaseCoupon: false });
      }
      if (change.status === "refunded") {
        if (BEFORE_SHIPPING.includes(order.status)) {
          result.restocked = await releaseOrderHolds(order, session, { releaseCoupon: true });
        }
        if (order.paymentStatus === "paid" || order.paymentStatus === "partially_refunded") {
          order.paymentStatus = "refunded";
          order.refundAmount  = order.total;
          order.refundedAt    = new Date();
        }
      }
      if (change.status === "delivered" && order.paymentMethod === "cod" && order.paymentStatus === "pending") {
        order.paymentStatus = "paid"; // cash collected at the door
        order.paidAt        = new Date();
      }

      order.status = change.status;
      if (change.trackingNo) order.trackingNo = change.trackingNo;
      if (change.courierName) order.courierName = change.courierName;
      await order.save({ session });

      await OrderTimeline.create(
        [{ orderId: order._id, status: change.status, note: change.note || `Status updated to ${label(change.status)}` }],
        { session }
      );

      result.order = order;
    });
  } finally {
    await session.endSession();
  }

  const order = result.order as IOrder;
  await clearProductCache(result.restocked);
  notifyStatusChanged(order, { location });
  return order;
}

/** PATCH /orders/:orderId/status — the team moves an order along. */
export async function changeOrderStatus(orderId: string, change: UpdateStatusInput) {
  const order = await Order.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);

  if (!canChangeStatus(order.status, change.status)) {
    throw new AppError(`An order that is ${label(order.status)} can't be changed to ${label(change.status)}`, 400);
  }

  if (change.status === "cancelled") {
    const done = await cancelAndSettle(order._id as Types.ObjectId, change.note || "Cancelled by the store");
    if (!done) throw new AppError("This order can no longer be cancelled", 409);
    return (await Order.findById(order._id)) as IOrder;
  }

  if (change.status === "refunded" && order.razorpayPaymentId && order.paymentStatus !== "refunded") {
    throw new AppError(
      "This order was paid online. Use the refund action so the money is actually returned — the status then updates by itself.",
      400
    );
  }

  return applyStatus(order._id as Types.ObjectId, change);
}

/**
 * A status update from the courier (Eshopbox webhook). Unlike a person's
 * request, an update that doesn't fit the order's current status is logged
 * and ignored rather than rejected — couriers re-send and re-order events.
 */
export async function applyCourierUpdate(
  orderId: string,
  status: string,
  details: { awb?: string; location?: string; courierStatus: string }
): Promise<void> {
  const order = await Order.findOne({ orderId });
  if (!order) return;

  if (details.awb && order.trackingNo !== details.awb) {
    await Order.updateOne({ _id: order._id }, { $set: { trackingNo: details.awb } });
  }
  if (order.status === status) return;

  if (!canChangeStatus(order.status, status)) {
    logger.warn(`Courier update ignored for ${orderId}: ${order.status} → ${status}`);
    return;
  }

  const note = `Eshopbox update: ${details.courierStatus}${details.location ? ` at ${details.location}` : ""}`;

  if (status === "cancelled") {
    await cancelAndSettle(order._id as Types.ObjectId, note);
    return;
  }
  await applyStatus(order._id as Types.ObjectId, { status: status as OrderStatus, trackingNo: details.awb, note }, details.location);
}

// ── Admin dashboard numbers ───────────────────────────────────────────────────

export async function getOrderStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart   = new Date(today.getFullYear(), today.getMonth(), 1);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  // Product and category figures count what was actually sold — not cancelled orders.
  const soldItemsOnly: mongoose.PipelineStage[] = [
    { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
    { $match: { "order.status": { $nin: ["cancelled"] } } },
  ];

  const [totalOrders, todayOrders, monthRevenueAgg, statusCounts, paymentSplit, revenueTrend, topProducts, categoryPerf] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: "$paymentMethod", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: "paid" } },
        { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      OrderItem.aggregate([
        ...soldItemsOnly,
        { $group: { _id: "$productId", name: { $first: "$productName" }, qtySold: { $sum: "$qty" }, revenue: { $sum: "$total" } } },
        { $sort: { qtySold: -1 } },
        { $limit: 10 },
      ]),
      OrderItem.aggregate([
        ...soldItemsOnly,
        { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
        { $unwind: "$product" },
        { $lookup: { from: "categories", localField: "product.categoryId", foreignField: "_id", as: "category" } },
        { $unwind: "$category" },
        { $group: { _id: "$category.name", revenue: { $sum: "$total" }, qtySold: { $sum: "$qty" } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
    ]);

  return {
    totalOrders,
    todayOrders,
    monthRevenue: monthRevenueAgg[0]?.total || 0,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    paymentSplit: Object.fromEntries(paymentSplit.map((p) => [p._id, p.count])),
    revenueTrend: revenueTrend.map((r) => ({
      month:   `${r._id.y}-${String(r._id.m).padStart(2, "0")}`,
      revenue: r.revenue,
      orders:  r.orders,
    })),
    topProducts,
    categoryPerf,
  };
}
