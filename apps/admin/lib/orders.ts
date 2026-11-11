// apps/admin/lib/orders.ts
//
// Everything the admin needs to read and move orders: the shapes the API
// returns, what the "next step" button does for each status, and the calls
// to GET /orders/admin/all, GET /orders/:orderId and PATCH /orders/:orderId/status.

import useSWR, { mutate } from "swr";
import { api } from "./api";

export interface OrderItem {
  _id?: string;
  productName: string;
  sku?: string;
  qty: number;
  price: number;
  total?: number;
}

export interface OrderAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pin: string;
}

export interface AdminOrder {
  _id: string;
  orderId: string;
  userId?: { name?: string; phone?: string } | null;
  address?: OrderAddress;
  subtotal: number;
  gst: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  trackingNo?: string;
  courierName?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface TimelineEntry {
  _id?: string;
  status: string;
  note?: string;
  createdAt: string;
}

export interface OrderDetail extends AdminOrder {
  timeline: TimelineEntry[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface OrdersPage {
  orders: AdminOrder[];
  pagination: Pagination;
}

const ORDERS_PREFIX = "/api/v1/orders";

export const ordersFetcher = (url: string) => api.get<{ data: OrdersPage }>(url).then((r) => r.data);
export const orderDetailFetcher = (url: string) => api.get<{ data: { order: OrderDetail } }>(url).then((r) => r.data.order);

export function ordersUrl(params: { status?: string; q?: string; payment?: string; page?: number; limit?: number }): string {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  if (params.payment) qs.set("payment", params.payment);
  qs.set("page", String(params.page || 1));
  qs.set("limit", String(params.limit || 20));
  return `${ORDERS_PREFIX}/admin/all?${qs.toString()}`;
}

/** How many orders are in one status. `undefined` while loading or when the role has no access. */
export function useOrderCount(status: string): number | undefined {
  const { data } = useSWR(ordersUrl({ status, limit: 1 }), ordersFetcher, { shouldRetryOnError: false });
  return data?.pagination.total;
}

// ── The single "next step" for an order in each status ─────────────────────
export interface NextStep {
  /** Button wording. */
  label: string;
  /** Status the order moves to. */
  status: string;
  /** Shipping needs a courier name and tracking number first. */
  needsTracking?: boolean;
}

export const NEXT_STEP: Record<string, NextStep> = {
  pending: { label: "Confirm", status: "confirmed" },
  confirmed: { label: "Mark packed", status: "processing" },
  processing: { label: "Mark shipped", status: "shipped", needsTracking: true },
  ready_for_pickup: { label: "Mark shipped", status: "shipped", needsTracking: true },
  shipped: { label: "Out for delivery", status: "out_for_delivery" },
  out_for_delivery: { label: "Mark delivered", status: "delivered" },
  NDR: { label: "Retry delivery", status: "out_for_delivery" },
};

/** Statuses where the order can still be cancelled by staff (stock is put back by the API). */
export const CANCELLABLE = ["pending", "confirmed", "processing", "ready_for_pickup"];

export interface StatusChange {
  status: string;
  trackingNo?: string;
  courierName?: string;
  note?: string;
}

/** Moves an order to a new status, then refreshes every order list, count and detail on screen. */
export async function updateOrderStatus(orderId: string, change: StatusChange): Promise<void> {
  await api.patch(`${ORDERS_PREFIX}/${encodeURIComponent(orderId)}/status`, change);
  await mutate((key) => typeof key === "string" && key.startsWith(ORDERS_PREFIX));
}

const METHOD_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  upi: "UPI",
  card: "Card",
  razorpay: "Razorpay",
  netbanking: "Net banking",
  wallet: "Wallet",
};

/** "UPI · Paid", "Cash on delivery", "Card · Payment failed". */
export function paymentLabel(order: Pick<AdminOrder, "paymentMethod" | "paymentStatus">): string {
  const method = METHOD_LABEL[order.paymentMethod || ""] || (order.paymentMethod || "—").toUpperCase();
  if (order.paymentMethod === "cod" && order.paymentStatus !== "paid") return method;
  const state: Record<string, string> = {
    paid: "Paid",
    pending: "Payment pending",
    failed: "Payment failed",
    refunded: "Refunded",
    partially_refunded: "Part refunded",
  };
  return `${method} · ${state[order.paymentStatus] || order.paymentStatus}`;
}

export function customerName(order: AdminOrder): string {
  return order.userId?.name || order.address?.name || "Customer";
}
