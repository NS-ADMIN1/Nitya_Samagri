// src/notifications/order.notifications.ts
//
// Everything a customer or the team is told about an order: email (Gmail
// SMTP) and live (WebSocket) updates. Login OTP is Firebase's job, and no
// SMS is sent from here. Services call these after the database work is
// done. None of them throws — a failed email must never fail an order.
import { IOrder } from "../database/models/Order";
import { User } from "../database/models/User";
import { sendEmail } from "../integrations/mail";
import { emitOrderUpdate, emitToAdmins, emitToUser } from "../websocket/ws.server";
import { logger } from "../utils/logger";

interface OrderLine {
  qty:         number;
  price:       number;
  productName: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Run a notification in the background and log, never throw. */
function inBackground(what: string, work: () => Promise<void>): void {
  work().catch((err) => logger.error(`Notification failed (${what})`, { err }));
}

async function findCustomer(order: IOrder) {
  return User.findById(order.userId).select("phone name email").lean();
}

/** "Hi Asha," — or just "Hi," for an OTP sign-up that never set a name. */
function greeting(name?: string): string {
  return name && name !== "New User" ? `Hi ${name},` : "Hi,";
}

/** Email the customer a short plain message — skipped when they have no email on file. */
async function emailCustomer(order: IOrder, subject: string, message: (hi: string) => string): Promise<void> {
  const user = await findCustomer(order);
  if (!user?.email) return;
  const text = `${message(greeting(user.name))}\n\n— Nitya Samagri`;
  await sendEmail({
    to: user.email,
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;font-size:15px;line-height:1.5;">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function orderConfirmationEmail(order: IOrder, lines: OrderLine[], customerName: string): string {
  const rows = lines
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(i.productName)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">₹${(i.price * i.qty).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const addr = order.address;
  const addressBlock = addr
    ? `${escapeHtml(addr.name)}<br>${escapeHtml(addr.line1)}${addr.line2 ? `, ${escapeHtml(addr.line2)}` : ""}<br>${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.pin)}`
    : "";

  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h2 style="color:#071C42;margin-bottom:4px;">Thank you for your order, ${escapeHtml(customerName)}!</h2>
    <p style="color:#555;">Your order <strong>${order.orderId}</strong> has been placed and is being processed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <thead><tr>
        <th style="text-align:left;padding:8px 0;border-bottom:2px solid #D6AF43;">Item</th>
        <th style="text-align:center;padding:8px 0;border-bottom:2px solid #D6AF43;">Qty</th>
        <th style="text-align:right;padding:8px 0;border-bottom:2px solid #D6AF43;">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table style="width:100%;margin-top:8px;font-size:14px;">
      <tr><td>Subtotal</td><td style="text-align:right;">₹${order.subtotal.toFixed(2)}</td></tr>
      <tr><td>GST</td><td style="text-align:right;">₹${order.gst.toFixed(2)}</td></tr>
      <tr><td>Shipping</td><td style="text-align:right;">₹${order.shipping.toFixed(2)}</td></tr>
      ${order.discount ? `<tr><td>Discount</td><td style="text-align:right;">-₹${order.discount.toFixed(2)}</td></tr>` : ""}
      <tr><td style="font-weight:bold;padding-top:8px;">Total</td><td style="text-align:right;font-weight:bold;padding-top:8px;">₹${order.total.toFixed(2)}</td></tr>
    </table>
    ${addressBlock ? `<p style="margin-top:16px;font-size:14px;"><strong>Shipping to</strong><br>${addressBlock}</p>` : ""}
    <p style="margin-top:24px;font-size:14px;color:#555;">
      You can track your order anytime at <a href="https://nityasamagri.in/account" style="color:#071C42;">nityasamagri.in/account</a>.
    </p>
  </div>`;
}

// ── Events ────────────────────────────────────────────────────────────────────

/** A new order was placed: alert the team, email the customer. */
export function notifyOrderPlaced(order: IOrder, lines: OrderLine[]): void {
  emitToAdmins({
    event: "NEW_ORDER_ALERT",
    payload: { orderId: order.orderId, amount: order.total, customer: String(order.userId), timestamp: Date.now() },
  });

  inBackground("order placed", async () => {
    const user = await findCustomer(order);
    if (!user?.email) return;
    await sendEmail({
      to: user.email,
      subject: `Order placed — ${order.orderId}`,
      html: orderConfirmationEmail(order, lines, user.name),
    });
  });
}

/** An online payment was received. */
export function notifyPaymentReceived(order: IOrder, paymentId: string): void {
  emitToUser(String(order.userId), {
    event: "PAYMENT_SUCCESS",
    payload: { orderId: order.orderId, amount: order.total, timestamp: Date.now() },
  });
  emitToAdmins({
    event: "NEW_ORDER_ALERT",
    payload: { orderId: order.orderId, amount: order.total, status: order.status, paymentId },
  });

  inBackground("payment received", () =>
    emailCustomer(
      order,
      `Payment received — ${order.orderId}`,
      (hi) => `${hi}\n\nWe have received your payment of ₹${order.total} for order ${order.orderId}. We are preparing your puja samagri.`
    )
  );
}

/** An online payment attempt failed. */
export function notifyPaymentFailed(order: IOrder): void {
  emitToUser(String(order.userId), { event: "PAYMENT_FAILED", payload: { orderId: order.orderId } });
}

/**
 * The order moved to a new status (by the team, the courier or a
 * cancellation). Always sends the live update; `email: false` skips the email.
 */
export function notifyStatusChanged(order: IOrder, options: { location?: string; email?: boolean } = {}): void {
  emitOrderUpdate({
    userId:  String(order.userId),
    orderId: order.orderId,
    status:  order.status,
    data:    { trackingNo: order.trackingNo, courierName: order.courierName, location: options.location },
  });

  if (options.email === false) return;

  const shippedVia  = order.courierName ? ` via ${order.courierName}` : "";
  const trackingRef = order.trackingNo ? ` Tracking number: ${order.trackingNo}.` : "";

  const updates: Record<string, { subject: string; line: string }> = {
    confirmed:        { subject: "Order confirmed",  line: `Your order ${order.orderId} has been confirmed.` },
    shipped:          { subject: "Order shipped",    line: `Your order ${order.orderId} has been shipped${shippedVia}.${trackingRef}` },
    out_for_delivery: { subject: "Out for delivery", line: `Your order ${order.orderId} is out for delivery.` },
    delivered:        { subject: "Order delivered",  line: `Your order ${order.orderId} has been delivered. Thank you for shopping at Nitya Samagri.` },
    cancelled:        { subject: "Order cancelled",  line: `Your order ${order.orderId} has been cancelled.` },
  };
  const update = updates[order.status];
  if (!update) return;

  inBackground("status changed", () =>
    emailCustomer(order, `${update.subject} — ${order.orderId}`, (hi) => `${hi}\n\n${update.line}`)
  );
}

/** Money was sent back to the customer. */
export function notifyRefund(order: IOrder, amount: number): void {
  emitToUser(String(order.userId), {
    event: "PAYMENT_SUCCESS",
    payload: { orderId: order.orderId, refundAmount: amount, message: "Refund initiated" },
  });

  inBackground("refund", () =>
    emailCustomer(
      order,
      `Refund started — ${order.orderId}`,
      (hi) => `${hi}\n\nA refund of ₹${amount} for order ${order.orderId} has been started. Your bank may take a few working days to credit it.`
    )
  );
}

/** Something about an order needs a person to look at it. */
export function alertTeam(orderId: string, message: string): void {
  logger.error(`Order ${orderId} needs attention: ${message}`);
  emitToAdmins({ event: "NEW_ORDER_ALERT", payload: { orderId, needsAttention: true, message, timestamp: Date.now() } });
}
