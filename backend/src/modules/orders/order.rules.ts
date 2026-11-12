// src/modules/orders/order.rules.ts
//
// The plain rules of an order — no database, no network — so they are easy
// to read and to test: how totals are worked out, and which status may
// follow which.

export const FREE_SHIPPING_FROM = 499; // ₹ — orders at or above this ship free
export const SHIPPING_FEE = 49;        // ₹
export const DEFAULT_GST_PCT = 5;      // used only when a product has no GST rate saved

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Packed",
  ready_for_pickup: "Ready for Pickup", shipped: "Shipped",
  out_for_delivery: "Out for Delivery", NDR: "Delivery Attempted", delivered: "Delivered",
  cancelled: "Cancelled", returned: "Returned", refunded: "Refunded",
};

/** Staff roles that may open any customer's order. Everyone else sees only their own. */
export const ORDER_STAFF_ROLES = ["admin", "super_admin", "order_manager", "warehouse", "support"];

// ── Totals ────────────────────────────────────────────────────────────────────

export interface PricedLine {
  price:  number; // unit price
  qty:    number;
  gstPct: number;
}

export interface CouponTerms {
  type:         "percent" | "flat";
  value:        number;
  maxDiscount?: number | null;
}

/** How much a coupon takes off. Never more than the items themselves cost. */
export function couponDiscount(coupon: CouponTerms, subtotal: number): number {
  let discount = 0;
  if (coupon.type === "percent") discount = Math.min(coupon.maxDiscount || Infinity, (subtotal * coupon.value) / 100);
  if (coupon.type === "flat") discount = coupon.value;
  return Math.max(0, Math.min(Math.round(discount), Math.floor(subtotal)));
}

/** Subtotal, GST, shipping and the amount to pay, in whole rupees. */
export function orderTotals(lines: PricedLine[], discount = 0) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const gst      = lines.reduce((sum, l) => sum + (l.price * l.qty * l.gstPct) / 100, 0);
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const applied  = Math.max(0, Math.min(discount, Math.floor(subtotal)));

  return {
    subtotal: Math.round(subtotal),
    gst:      Math.round(gst),
    shipping,
    discount: applied,
    total:    Math.max(0, Math.round(subtotal + gst + shipping - applied)),
  };
}

// ── Status flow ───────────────────────────────────────────────────────────────
//
//   pending → confirmed → processing → ready_for_pickup → shipped
//           → out_for_delivery ⇄ NDR → delivered
//
//   cancelled  only before shipping
//   returned   only once shipped (including after delivery)
//   refunded   from any status; nothing follows it
//
// Steps may be skipped going forward (pending → shipped) but an order never
// moves backward, and a cancelled or returned order never re-enters the flow.

const FLOW_RANK: Record<string, number> = {
  pending: 0, confirmed: 1, processing: 2, ready_for_pickup: 3,
  shipped: 4, out_for_delivery: 5, NDR: 5, delivered: 6,
};

/** Statuses in which the parcel has not left yet — the order can still be cancelled. */
export const BEFORE_SHIPPING = ["pending", "confirmed", "processing", "ready_for_pickup"];

export function canChangeStatus(from: string, to: string): boolean {
  if (from === to) return false;

  const fromRank = FLOW_RANK[from];
  const toRank   = FLOW_RANK[to];

  if (to === "cancelled") return BEFORE_SHIPPING.includes(from);
  if (to === "returned")  return fromRank !== undefined && fromRank >= FLOW_RANK.shipped;
  if (to === "refunded")  return from !== "refunded";

  // A step in the normal flow
  if (fromRank === undefined || toRank === undefined) return false; // from cancelled / returned / refunded
  if (from === "delivered") return false;
  return toRank >= fromRank;
}
