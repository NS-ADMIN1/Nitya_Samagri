// src/modules/shipping/shipping.service.ts
//
// Delivery through Eshopbox, a managed fulfilment partner: they run the
// warehouse and pick the courier, so there is no courier choice, pickup
// booking or NDR handling on our side.
import crypto from "crypto";
import { Order } from "../../database/models/Order";
import { OrderItem } from "../../database/models/OrderItem";
import { OrderTimeline } from "../../database/models/OrderTimeline";
import { Address } from "../../database/models/Address";
import { User } from "../../database/models/User";
import { eshopboxService } from "../../integrations/eshopbox.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { notifyStatusChanged } from "../../notifications/order.notifications";
import { FREE_SHIPPING_FROM, ORDER_STAFF_ROLES } from "../orders/order.rules";
import { applyCourierUpdate } from "../orders/order.service";
import { ShippingRatesQuery } from "./shipping.schema";

const ESTIMATED_DAYS = "3-5 business days";

/** Eshopbox's status words → our order statuses. */
const COURIER_STATUS: Record<string, string> = {
  CONFIRMED:          "confirmed",
  "READY TO SHIP":    "ready_for_pickup",
  SHIPPED:            "shipped",
  "OUT FOR DELIVERY": "out_for_delivery",
  DELIVERED:          "delivered",
  RTO:                "returned",
  UNDELIVERED:        "NDR",
  CANCELLED:          "cancelled",
};

function sameSecret(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Customer-facing ───────────────────────────────────────────────────────────

/** Delivery charge for a cart — free from FREE_SHIPPING_FROM, otherwise a flat fee. */
export async function getShippingRate(query: ShippingRatesQuery) {
  if (query.orderValue >= FREE_SHIPPING_FROM) {
    return { freeShipping: true, shippingCharge: 0, message: "Free delivery on this order!", estimatedDays: ESTIMATED_DAYS };
  }
  const shippingCharge = await eshopboxService.calculateRate({ orderValue: query.orderValue });
  return { freeShipping: false, shippingCharge, estimatedDays: ESTIMATED_DAYS };
}

/** Live tracking for an order. Customers can only track their own orders. */
export async function trackOrder(orderId: string, viewer: { userId: string; role: string }) {
  const filter: Record<string, unknown> = { orderId };
  if (!ORDER_STAFF_ROLES.includes(viewer.role)) filter.userId = viewer.userId;

  if (!(await Order.exists(filter))) throw new AppError("Order not found", 404);
  return eshopboxService.trackByOrderId(orderId);
}

// ── Admin ─────────────────────────────────────────────────────────────────────

/** Hand an order to Eshopbox for packing and delivery. */
export async function handOffToEshopbox(orderId: string) {
  const order = await Order.findOne({ orderId });
  if (!order) throw new AppError("Order not found", 404);

  const [items, user, savedAddress] = await Promise.all([
    OrderItem.find({ orderId: order._id }),
    User.findById(order.userId).select("name email phone").lean(),
    Address.findById(order.addressId).select("phone").lean(),
  ]);

  // The address is the copy saved on the order when it was placed, so it is
  // still right even if the customer has since edited or deleted the address.
  const phone = savedAddress?.phone || user?.phone;
  if (!phone) throw new AppError("This order has no contact phone number", 400);

  const ebOrder = await eshopboxService.createOrder({
    orderId:   order.orderId,
    orderDate: order.createdAt.toISOString(),
    customer: {
      name:     order.address.name,
      email:    user?.email || "",
      phone,
      address:  order.address.line1,
      address2: order.address.line2 || "",
      city:     order.address.city,
      state:    order.address.state,
      pincode:  order.address.pin,
      country:  "IN",
    },
    items: items.map((item) => ({
      name:          item.productName,
      sku:           item.sku,
      units:         item.qty,
      selling_price: item.price,
    })),
    paymentMethod: order.paymentMethod === "cod" ? "COD" : "Prepaid",
    subTotal:      order.subtotal,
    length:  20,
    breadth: 15,
    height:  10,
    weight:  0.5,
  });

  // Handing off confirms a new order; an order already further along keeps its status.
  const wasPending = order.status === "pending";
  if (wasPending) {
    order.status = "confirmed";
    await order.save();
  }

  await OrderTimeline.create({
    orderId: order._id,
    status:  order.status,
    note:    `Handed off to Eshopbox for fulfillment | Eshopbox order: ${ebOrder.eshopboxOrderId}`,
  });

  if (wasPending) notifyStatusChanged(order);

  return { eshopboxOrderId: ebOrder.eshopboxOrderId };
}

// ── Eshopbox webhook ──────────────────────────────────────────────────────────

/**
 * A status update pushed by Eshopbox. The caller must send the shared
 * secret; with no secret configured, every call is refused.
 *
 * ⚠️ The payload field names and status words are best-effort (see
 * eshopbox.service.ts) — check them against a real webhook delivery.
 */
export async function handleEshopboxWebhook(body: Record<string, unknown>, providedSecret: string, callerIp: string) {
  const configuredSecret = env.ESHOPBOX_WEBHOOK_SECRET || "";
  if (!configuredSecret) {
    logger.error("Eshopbox webhook rejected: ESHOPBOX_WEBHOOK_SECRET is not configured");
    throw new AppError("Webhook not configured", 403);
  }
  if (!providedSecret || !sameSecret(configuredSecret, providedSecret)) {
    logger.warn(`Eshopbox webhook rejected: invalid or missing secret (IP ${callerIp})`);
    throw new AppError("Unauthorized", 403);
  }

  const event = eshopboxService.parseWebhook(body);
  logger.info(`Eshopbox webhook: order=${event.orderId} Status=${event.status}`);

  const status = COURIER_STATUS[String(event.status || "").toUpperCase()];
  if (!event.orderId || !status) return;

  // The orders service applies the same rules as a status change made in the
  // admin panel and sends the customer/team notifications.
  await applyCourierUpdate(event.orderId, status, {
    awb:           event.awb,
    location:      event.location,
    courierStatus: event.status,
  });
}
