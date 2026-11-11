"use client";

// apps/admin/components/dashboard/LowStockList.tsx
//
// The few products closest to running out (out-of-stock first), from
// GET /products/admin/all. Hidden for roles that cannot see inventory.

import useSWR from "swr";
import { api } from "../../lib/api";
import { STOCK_LEVEL, stockLevel } from "../../lib/orderStatus";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import StatusPill from "../ui/StatusPill";

interface StockProduct {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockAt: number;
}

const fetcher = (url: string) => api.get<{ data: { products: StockProduct[] } }>(url).then((r) => r.data.products);
const url = (stockFilter: "out" | "low") => `/api/v1/products/admin/all?status=all&stockFilter=${stockFilter}&limit=4&sortBy=stock&sortOrder=asc`;

export default function LowStockList() {
  const { data: out, error } = useSWR(url("out"), fetcher, { shouldRetryOnError: false });
  const { data: low } = useSWR(url("low"), fetcher, { shouldRetryOnError: false });

  if (error) return null; // this role has no inventory access
  const products = [...(out || []), ...(low || [])].slice(0, 4);

  return (
    <Card>
      <CardHeader
        title="Running low"
        subtitle="At or below the alert level"
        action={
          <Button variant="quiet" size="sm" href="/inventory">
            Open inventory
          </Button>
        }
      />
      {!out && !low ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate">All products are well stocked.</p>
      ) : (
        <ul className="flex flex-col">
          {products.map((p) => {
            const level = stockLevel(p.stock, p.lowStockAt);
            return (
              <li key={p._id} className="flex items-center gap-3 border-b border-[#EEF0F3] py-2.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-navy">{p.name}</div>
                  <div className="text-xs text-slate">{p.sku}</div>
                </div>
                <StatusPill tone={STOCK_LEVEL[level].tone}>{level === "out" ? "Out of stock" : `${p.stock} left`}</StatusPill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
