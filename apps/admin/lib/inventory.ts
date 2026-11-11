// apps/admin/lib/inventory.ts
//
// Stock changes and their history.
//   PATCH /products/:id/stock        add / subtract / set, always logged
//   GET   /products/admin/:id/logs   last 50 changes for one product

import { api } from "./api";
import { refreshProducts } from "./products";

export type StockOperation = "add" | "subtract" | "set";

export interface StockLog {
  _id: string;
  /** Positive when stock went up, negative when it went down. */
  change: number;
  reason: "order" | "manual_adjustment" | "return" | "restock";
  note?: string;
  performedBy?: { name?: string } | null;
  createdAt: string;
}

export const stockLogsUrl = (productId: string) => `/api/v1/products/admin/${productId}/logs`;
export const stockLogsFetcher = (url: string) => api.get<{ data: { logs: StockLog[] } }>(url).then((r) => r.data.logs);

/** Changes one product's stock, then refreshes every list, count and history on screen. */
export async function adjustStock(productId: string, operation: StockOperation, quantity: number, note?: string): Promise<void> {
  await api.patch(`/api/v1/products/${productId}/stock`, { quantity, operation, note: note?.trim() || undefined });
  await refreshProducts();
}

const REASON_LABEL: Record<StockLog["reason"], string> = {
  order: "Customer order",
  manual_adjustment: "Changed by staff",
  return: "Order returned or cancelled",
  restock: "Restocked",
};

export function stockReasonLabel(reason: string): string {
  return REASON_LABEL[reason as StockLog["reason"]] || reason;
}
