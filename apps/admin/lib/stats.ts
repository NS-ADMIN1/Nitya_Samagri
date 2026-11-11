// apps/admin/lib/stats.ts
//
// Store-wide numbers for the Dashboard and Reports pages.
//   GET /orders/admin/stats        — admin and super admin only
//   GET /products/admin/all        — its `stats` block gives the stock counts

import useSWR from "swr";
import { api } from "./api";

export interface OrderStats {
  totalOrders: number;
  todayOrders: number;
  /** Paid orders this calendar month, in rupees. */
  monthRevenue: number;
  statusCounts: Record<string, number>;
  paymentSplit: Record<string, number>;
  /** Last six months, oldest first. `month` is "2026-11". Paid orders only. */
  revenueTrend: { month: string; revenue: number; orders: number }[];
  topProducts: { _id: string; name: string; qtySold: number; revenue: number }[];
  categoryPerf: { _id: string; revenue: number; qtySold: number }[];
}

const statsFetcher = (url: string) => api.get<{ data: OrderStats }>(url).then((r) => r.data);

/** `error.status === 403` means the signed-in role cannot see store-wide numbers. */
export function useOrderStats() {
  return useSWR("/api/v1/orders/admin/stats", statsFetcher, { shouldRetryOnError: false });
}

/** Average value of a paid order this month, or `undefined` when there are none yet. */
export function monthAverageOrder(stats: OrderStats): number | undefined {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const current = stats.revenueTrend.find((r) => r.month === key);
  if (!current || current.orders === 0) return undefined;
  return current.revenue / current.orders;
}

export interface StockCounts {
  total: number;
  lowStockCount: number;
  outOfStockCount: number;
}

const stockFetcher = (url: string) => api.get<{ data: { stats: StockCounts } }>(url).then((r) => r.data.stats);

/** `undefined` while loading or when the role has no inventory access. */
export function useStockCounts(): StockCounts | undefined {
  const { data } = useSWR("/api/v1/products/admin/all?status=all&limit=1", stockFetcher, { shouldRetryOnError: false });
  return data;
}
