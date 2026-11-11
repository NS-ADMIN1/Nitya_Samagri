// apps/admin/lib/orderStatus.ts
//
// One place for how an order status (and a stock level) is worded and
// coloured across the admin. Status keys are the backend's Order.status
// values; the labels say what the team has to do next.

import type { PillTone } from "../components/ui/StatusPill";

interface StatusMeta {
  label: string;
  tone: PillTone;
}

export const ORDER_STATUS: Record<string, StatusMeta> = {
  pending: { label: "To confirm", tone: "gold" },
  confirmed: { label: "To pack", tone: "blue" },
  processing: { label: "Packed", tone: "violet" },
  ready_for_pickup: { label: "Ready for pickup", tone: "plum" },
  shipped: { label: "Shipped", tone: "teal" },
  out_for_delivery: { label: "Out for delivery", tone: "teal" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
  returned: { label: "Returned", tone: "orange" },
  refunded: { label: "Refunded", tone: "grey" },
  NDR: { label: "Delivery failed", tone: "red" },
};

export function orderStatusMeta(status: string): StatusMeta {
  return ORDER_STATUS[status] || { label: status, tone: "grey" };
}

export type StockLevel = "ok" | "low" | "out";

export const STOCK_LEVEL: Record<StockLevel, StatusMeta> = {
  ok: { label: "Healthy", tone: "green" },
  low: { label: "Low", tone: "orange" },
  out: { label: "Out of stock", tone: "red" },
};

/** `threshold` is the product's low-stock alert level. */
export function stockLevel(quantity: number, threshold: number): StockLevel {
  if (quantity <= 0) return "out";
  if (quantity <= threshold) return "low";
  return "ok";
}
