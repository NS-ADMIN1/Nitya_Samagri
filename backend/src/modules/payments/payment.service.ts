// src/modules/payments/payment.service.ts
//
// Online payments (Razorpay) and refunds.
//
// A payment can reach us two ways, and both end in recordCapturedPayment():
//   1. the customer's browser calls POST /payments/verify after paying
//   2. Razorpay calls POST /payments/webhook — this still arrives when the
//      customer closes the browser before step 1
// recordCapturedPayment() marks an order paid at most once, so it does not
// matter which arrives first or whether both do.
import mongoose, { Types } from "mongoose";
import { Order, IOrder } from "../../database/models/Order";
import { PaymentLog } from "../../database/models/PaymentLog";
import { User } from "../../database/models/User";
import { OrderTimeline } from "../../database/models/OrderTimeline";
import { razorpayService, WebhookEvent } from "../../integrations/razorpay.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { BEFORE_SHIPPING, ORDER_STAFF_ROLES } from "../orders/order.rules";
import { clearProductCache } from "../../cache/product.cache";
import { releaseOrderHolds } from "../orders/order.stock";
import {
  alertTeam,
  notifyPaymentFailed,
  notifyPaymentReceived,
  notifyRefund,
  notifyStatusChanged,
} from "../../notifications/order.notifications";
import { RefundInput, VerifyPaymentInput } from "./payment.schema";

const EPSILON = 0.01; // rupees — tolerance when comparing money amounts
const toPaise = (rupees: number) => Math.round(rupees * 100);
const UNPAID = ["pending", "failed"];

interface CapturedPayment {
  paymentId:       string;
  razorpayOrderId: string;
  method:          string;
  signature?:      string;
}

// ── Starting a payment ────────────────────────────────────────────────────────

/** Create the Razorpay order the checkout window pays against. */
export async function createPaymentOrder(userId: string, orderId: string) {
  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError("Order not found", 404);
  if (!UNPAID.includes(order.paymentStatus)) throw new AppError("Order already paid", 400);
  if (!BEFORE_SHIPPING.includes(order.status)) {
    throw new AppError(
      order.status === "cancelled"
        ? "This order was cancelled, so it can no longer be paid. Please place the order again."
        : "This order can no longer be paid online.",
      400
    );
  }

  const rzpOrder = await razorpayService.createOrder({
    amount:  order.total,
    receipt: order.orderId,
    notes:   { orderId: order.orderId, customerId: String(order.userId), type: "product" },
  });

  order.razorpayOrderId = rzpOrder.id;
  await order.save();

  return {
    razorpayOrderId: rzpOrder.id,
    amount:          rzpOrder.amount,
    currency:        rzpOrder.currency,
    keyId:           env.RAZORPAY_KEY_ID,
    prefill:         { name: "", email: "", contact: "" },
  };
}

/** Everything the Razorpay checkout window needs for an order that is ready to be paid. */
export async function getCheckoutConfig(userId: string, orderId: string) {
  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError("Order not found", 404);
  if (!UNPAID.includes(order.paymentStatus)) throw new AppError("Order already paid", 400);
  if (!order.razorpayOrderId) throw new AppError("Payment not initialized", 400);

  const user = await User.findById(userId).select("name phone email").lean();

  return razorpayService.getCheckoutConfig({
    orderId:  order.razorpayOrderId,
    amount:   order.total,
    name:     user?.name || "",
    phone:    user?.phone || "",
    email:    user?.email || "",
    orderRef: order.orderId,
  });
}

/** A payment's status at Razorpay. Customers can only look up payments on their own orders. */
export async function getPaymentStatus(paymentId: string, viewer: { userId: string; role: string }) {
  if (!ORDER_STAFF_ROLES.includes(viewer.role)) {
    const own = await Order.exists({ razorpayPaymentId: paymentId, userId: viewer.userId });
    if (!own) throw new AppError("Payment not found", 404);
  }

  const payment = await razorpayService.fetchPayment(paymentId);
  return {
    status:   payment.status,
    method:   payment.method,
    amount:   Number(payment.amount) / 100,
    captured: payment.captured,
  };
}

// ── Recording a payment ───────────────────────────────────────────────────────

/**
 * Mark an order paid: order fields, payment log and timeline in one
 * transaction. Returns false when the order was already paid (the other of
 * verify / webhook got here first), so nothing is recorded twice.
 */
async function recordCapturedPayment(orderDbId: Types.ObjectId, payment: CapturedPayment): Promise<boolean> {
  const result: { order?: IOrder } = {};

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      result.order = undefined;

      const order = await Order.findOne({ _id: orderDbId, paymentStatus: { $in: UNPAID } }).session(session);
      if (!order) return; // already paid

      const lateForCancelledOrder = order.status === "cancelled";

      order.paymentStatus     = "paid";
      order.paidAt            = new Date();
      order.razorpayOrderId   = payment.razorpayOrderId;
      order.razorpayPaymentId = payment.paymentId;
      if (payment.signature) order.razorpaySignature = payment.signature;
      if (order.status === "pending") order.status = "confirmed";
      await order.save({ session });

      await PaymentLog.create(
        [
          {
            orderId:           order._id,
            razorpayOrderId:   payment.razorpayOrderId,
            razorpayPaymentId: payment.paymentId,
            amount:            order.total,
            currency:          "INR",
            status:            "captured",
            method:            payment.method || "unknown",
            gateway:           "razorpay",
          },
        ],
        { session }
      );

      await OrderTimeline.create(
        [
          {
            orderId: order._id,
            status:  order.status,
            note:    lateForCancelledOrder
              ? `Payment of ₹${order.total} arrived after the order was cancelled — it is being refunded`
              : `Payment of ₹${order.total} received via Razorpay`,
          },
        ],
        { session }
      );

      result.order = order;
    });
  } finally {
    await session.endSession();
  }

  const order = result.order;
  if (!order) return false;

  if (order.status === "cancelled") {
    // The customer paid after the unpaid order had been cancelled and its
    // stock released. The order cannot be honoured, so the money goes back.
    await refundAutomatically(order.orderId, "Payment arrived after the order was cancelled");
  } else {
    notifyPaymentReceived(order, payment.paymentId);
  }
  return true;
}

/** POST /payments/verify — the customer's browser reports a finished payment. */
export async function confirmCheckoutPayment(userId: string, input: VerifyPaymentInput) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = input;

  if (!razorpayService.verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
    throw new AppError("Payment verification failed. Invalid signature.", 400);
  }

  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError("Order not found", 404);

  if (!UNPAID.includes(order.paymentStatus)) {
    return { orderId: order.orderId, alreadyVerified: true };
  }
  if (order.razorpayOrderId !== razorpayOrderId) {
    throw new AppError("Payment does not match this order.", 400);
  }

  // Never trust the browser alone — ask Razorpay what was actually paid.
  const payment = await razorpayService.fetchPayment(razorpayPaymentId);
  if (payment.order_id !== razorpayOrderId) {
    throw new AppError("Payment does not match this order.", 400);
  }
  if (Number(payment.amount) !== toPaise(order.total)) {
    throw new AppError("Payment amount does not match order total.", 400);
  }
  if (payment.status !== "captured") {
    throw new AppError(`Payment has not been captured (status: ${payment.status}).`, 400);
  }

  await recordCapturedPayment(order._id as Types.ObjectId, {
    paymentId:       razorpayPaymentId,
    razorpayOrderId,
    method:          String(payment.method || "unknown"),
    signature:       razorpaySignature,
  });

  return { orderId: order.orderId, alreadyVerified: false };
}

// ── Razorpay webhook ──────────────────────────────────────────────────────────

type RazorpayEntity = Record<string, unknown>;

/**
 * Find our order for a Razorpay payment: by the Razorpay order it was paid
 * against, or by the order ID we put in the notes when creating it.
 */
async function findOrderForPayment(payment: RazorpayEntity) {
  const razorpayOrderId = payment.order_id as string | undefined;
  if (razorpayOrderId) {
    const order = await Order.findOne({ razorpayOrderId });
    if (order) return order;
  }
  const notes = payment.notes as { orderId?: string } | undefined;
  if (notes && typeof notes.orderId === "string") {
    return Order.findOne({ orderId: notes.orderId });
  }
  return null;
}

async function onPaymentCaptured(payment: RazorpayEntity) {
  const order = await findOrderForPayment(payment);
  if (!order) {
    logger.warn(`Razorpay webhook: payment ${payment.id} matches no order`);
    return;
  }
  if (Number(payment.amount) !== toPaise(order.total)) {
    alertTeam(order.orderId, `Razorpay payment ${payment.id} is for ₹${Number(payment.amount) / 100}, but the order total is ₹${order.total}. Not marked paid.`);
    return;
  }

  await recordCapturedPayment(order._id as Types.ObjectId, {
    paymentId:       String(payment.id),
    razorpayOrderId: String(payment.order_id || order.razorpayOrderId || ""),
    method:          String(payment.method || "unknown"),
  });
}

async function onPaymentFailed(payment: RazorpayEntity) {
  const order = await findOrderForPayment(payment);
  if (!order) return;

  // Razorpay re-sends webhooks; log each failed attempt once.
  const paymentId = String(payment.id);
  const alreadyLogged = await PaymentLog.exists({ razorpayPaymentId: paymentId, status: "failed" });
  if (alreadyLogged) return;

  // Only an order still waiting for payment becomes "failed" — a failed
  // retry must never undo a payment that already went through.
  await Order.updateOne({ _id: order._id, paymentStatus: "pending" }, { $set: { paymentStatus: "failed" } });

  await PaymentLog.create({
    orderId:           order._id,
    razorpayOrderId:   payment.order_id as string,
    razorpayPaymentId: paymentId,
    amount:            order.total,
    currency:          "INR",
    status:            "failed",
    method:            (payment.method as string) || "unknown",
    gateway:           "razorpay",
    errorCode:         payment.error_code as string,
    errorDescription:  payment.error_description as string,
  });

  notifyPaymentFailed(order);
}

async function onRefundProcessed(refund: RazorpayEntity) {
  const refundId = String(refund.id);

  // Refunds started by this API are recorded when they are made (refundOrder
  // below) and tagged in their notes; only a refund made by hand in the
  // Razorpay dashboard still needs recording here.
  const notes = refund.notes as { source?: string } | undefined;
  if (notes?.source === REFUND_SOURCE) return;
  if (await PaymentLog.exists({ refundId })) return;

  const order = await Order.findOne({ razorpayPaymentId: refund.payment_id as string });
  if (!order || order.refundId === refundId) return;

  await applyRefund(order._id as Types.ObjectId, Number(refund.amount) / 100, refundId, {
    alreadyCounted: false,
    note: "Refund made from the Razorpay dashboard",
  });
}

/** POST /payments/webhook — `rawBody` is the untouched request body (see app.ts). */
export async function handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!Buffer.isBuffer(rawBody)) throw new AppError("Invalid webhook payload", 400);
  if (!signature || !razorpayService.verifyWebhookSignature(rawBody, signature)) {
    throw new AppError("Invalid webhook signature", 400);
  }

  const event: WebhookEvent = razorpayService.parseWebhookEvent(rawBody);

  switch (event.event) {
    case "payment.captured":
      if (event.payload.payment) await onPaymentCaptured(event.payload.payment.entity);
      break;
    case "payment.failed":
      if (event.payload.payment) await onPaymentFailed(event.payload.payment.entity);
      break;
    case "refund.processed":
      if (event.payload.refund) await onRefundProcessed(event.payload.refund.entity);
      break;
  }
}

// ── Refunds ───────────────────────────────────────────────────────────────────

const REFUND_SOURCE = "nitya-samagri-api";

/**
 * Record a refund on the order: amounts, payment status, payment log and
 * timeline, in one transaction.
 *
 *  - partly refunded → paymentStatus "partially_refunded"; the order status stays
 *  - fully refunded  → paymentStatus "refunded" and order status "refunded";
 *    if the parcel never left, its stock and coupon are released too
 */
async function applyRefund(
  orderDbId: Types.ObjectId,
  amount: number,
  refundId: string,
  options: { alreadyCounted: boolean; note?: string }
): Promise<IOrder> {
  const result: { order?: IOrder; restocked: Types.ObjectId[] } = { restocked: [] };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderDbId).session(session);
      if (!order) throw new AppError("Order not found", 404);

      if (!options.alreadyCounted) {
        order.refundAmount = Math.min(order.total, (order.refundAmount || 0) + amount);
      }
      const refundedSoFar = order.refundAmount || 0;
      const fullyRefunded = refundedSoFar >= order.total - EPSILON;

      order.paymentStatus = fullyRefunded ? "refunded" : "partially_refunded";
      order.refundId      = refundId;
      order.refundedAt    = new Date();

      if (fullyRefunded) {
        const neverShipped = BEFORE_SHIPPING.includes(order.status) || order.status === "cancelled";
        result.restocked = neverShipped ? await releaseOrderHolds(order, session, { releaseCoupon: true }) : [];
        order.status = "refunded";
      }
      await order.save({ session });

      await PaymentLog.create(
        [
          {
            orderId:           order._id,
            razorpayOrderId:   order.razorpayOrderId,
            razorpayPaymentId: order.razorpayPaymentId,
            amount,
            currency:          "INR",
            status:            "refunded",
            gateway:           "razorpay",
            refundId,
          },
        ],
        { session }
      );

      await OrderTimeline.create(
        [
          {
            orderId: order._id,
            status:  order.status,
            note:
              `${options.note || "Refund"}: ₹${amount.toFixed(2)} ` +
              `(₹${refundedSoFar.toFixed(2)} of ₹${order.total.toFixed(2)} refunded to date). Refund ID: ${refundId}`,
          },
        ],
        { session }
      );

      result.order = order;
    });
  } finally {
    await session.endSession();
  }

  const order = result.order as IOrder;
  await clearProductCache(result.restocked);
  notifyRefund(order, amount);
  if (order.status === "refunded") notifyStatusChanged(order);
  return order;
}

/**
 * Send money back through Razorpay. `amount` is in rupees; leave it out to
 * refund everything that has not been refunded yet.
 */
export async function refundOrder(input: RefundInput) {
  const order = await Order.findOne({ orderId: input.orderId });
  if (!order) throw new AppError("Order not found", 404);
  if (!order.razorpayPaymentId) throw new AppError("No payment found for this order", 400);

  const alreadyRefunded = order.refundAmount || 0;
  const remaining       = Math.max(0, order.total - alreadyRefunded);
  if (order.paymentStatus === "refunded" || remaining <= EPSILON) throw new AppError("Already refunded", 400);

  const thisRefund = input.amount ?? remaining;
  if (thisRefund > remaining + EPSILON) {
    throw new AppError(
      `Refund would exceed order total. Already refunded ₹${alreadyRefunded.toFixed(2)} of ₹${order.total.toFixed(2)} — max additional refund is ₹${remaining.toFixed(2)}.`,
      400
    );
  }

  // Count this refund against the order BEFORE asking Razorpay for it. The
  // condition is part of the update, so two refund clicks at the same moment
  // cannot together send back more than was paid.
  const ceiling = order.total - thisRefund + EPSILON;
  const reserved = await Order.findOneAndUpdate(
    { _id: order._id, $or: [{ refundAmount: { $lte: ceiling } }, { refundAmount: { $exists: false } }] },
    { $inc: { refundAmount: thisRefund } },
    { new: true }
  );
  if (!reserved) {
    throw new AppError("Another refund for this order is already in progress. Check the order and try again.", 409);
  }

  let refundId: string;
  try {
    const refund = await razorpayService.initiateRefund({
      paymentId:   order.razorpayPaymentId,
      amount:      thisRefund,
      reason:      input.reason || "Refund initiated by admin",
      referenceId: order.orderId,
      notes:       { source: REFUND_SOURCE },
    });
    refundId = refund.id;
  } catch (err) {
    // Razorpay refused — take the reservation back so the amount can be refunded later.
    await Order.updateOne({ _id: order._id }, { $inc: { refundAmount: -thisRefund } });
    throw err;
  }

  const updated = await applyRefund(order._id as Types.ObjectId, thisRefund, refundId, {
    alreadyCounted: true,
    note: input.reason,
  });

  return { refundId, amount: thisRefund, totalRefunded: updated.refundAmount || 0 };
}

/**
 * Refund everything paid on an order without a person asking for it — used
 * when a paid order is cancelled. If Razorpay refuses, the team is alerted
 * to refund by hand; the caller's own work (the cancellation) still stands.
 * Returns true when the refund was started.
 */
export async function refundAutomatically(orderId: string, reason: string): Promise<boolean> {
  try {
    await refundOrder({ orderId, reason });
    return true;
  } catch (err) {
    const why = err instanceof Error ? err.message : "unknown error";
    const order = await Order.findOne({ orderId }).select("_id status");
    if (order) {
      await OrderTimeline.create({
        orderId: order._id,
        status:  order.status,
        note:    `Automatic refund failed (${why}). Refund this order by hand.`,
      }).catch(() => undefined);
    }
    alertTeam(orderId, `Automatic refund failed (${why}). Refund this order by hand.`);
    return false;
  }
}

// ── History ───────────────────────────────────────────────────────────────────

/** A customer's 20 most recent payments. */
export function listMyPayments(userId: string) {
  return Order.find({ userId, paymentStatus: { $ne: "pending" } })
    .select("orderId total paymentMethod paymentStatus paidAt refundedAt refundAmount")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}
