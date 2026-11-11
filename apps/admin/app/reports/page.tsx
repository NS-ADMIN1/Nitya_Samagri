"use client";

// apps/admin/app/reports/page.tsx
//
// Reports: how the store is doing, from real order data only
// (GET /orders/admin/stats — admin and super admin). Sections for which
// the API has no data yet (GST, courier, coupon reports) are not shown.

import BarList from "../../components/dashboard/BarList";
import KpiCard from "../../components/dashboard/KpiCard";
import AdminShell from "../../components/layout/AdminShell";
import RevenueTrend from "../../components/reports/RevenueTrend";
import Card, { CardHeader } from "../../components/ui/Card";
import Notice, { errorMessage } from "../../components/ui/Notice";
import { formatCount, formatINR, formatINRShort, plural } from "../../lib/format";
import { ORDER_STATUS } from "../../lib/orderStatus";
import { monthAverageOrder, useOrderStats } from "../../lib/stats";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  upi: "UPI",
  card: "Card",
  razorpay: "Razorpay",
  netbanking: "Net banking",
  wallet: "Wallet",
};

export default function ReportsPage() {
  const { data: stats, error, isLoading } = useOrderStats();
  const average = stats ? monthAverageOrder(stats) : undefined;

  return (
    <AdminShell title="Reports" subtitle="Sales, products and payments from your real orders">
      {error ? (
        <Notice tone="error">{errorMessage(error, "reports")}</Notice>
      ) : isLoading || !stats ? (
        <p className="text-sm text-slate">Loading reports…</p>
      ) : (
        <>
          <section aria-label="Headline numbers" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Revenue this month" value={formatINRShort(stats.monthRevenue)} note="Paid orders only" />
            <KpiCard label="Average order value" value={average === undefined ? "—" : formatINR(Math.round(average))} note="Paid orders this month" />
            <KpiCard label="Orders today" value={formatCount(stats.todayOrders)} note="Since midnight" />
            <KpiCard label="Orders so far" value={formatCount(stats.totalOrders)} note="All time" />
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Revenue by month" subtitle="Last six months · paid orders" />
              <RevenueTrend trend={stats.revenueTrend} />
            </Card>
            <Card>
              <CardHeader title="Orders by status" subtitle="All orders so far" />
              <BarList
                emptyText="No orders yet"
                items={Object.entries(stats.statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => ({ label: ORDER_STATUS[status]?.label || status, value: count }))}
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card>
              <CardHeader title="Top selling products" subtitle="By units sold, all time" />
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-slate">No products sold yet.</p>
              ) : (
                <ol className="flex flex-col">
                  {stats.topProducts.map((p, i) => (
                    <li key={p._id} className="flex items-center gap-3 border-b border-[#EEF0F3] py-2.5 last:border-b-0">
                      <span className="w-6 text-center text-[13px] font-semibold tabular-nums text-slate">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-navy">{p.name}</div>
                        <div className="text-xs text-slate">{plural(p.qtySold, "unit")} sold</div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-navy">{formatINRShort(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card>
              <CardHeader title="Sales by category" subtitle="Revenue, all time" />
              <BarList
                emptyText="No category sales yet"
                items={stats.categoryPerf.map((c) => ({ label: c._id, value: c.revenue, display: formatINRShort(c.revenue), color: "#D6AF43" }))}
              />
            </Card>
            <Card>
              <CardHeader title="How customers pay" subtitle="Number of orders by payment type" />
              <BarList
                emptyText="No orders yet"
                items={Object.entries(stats.paymentSplit)
                  .filter(([method]) => method && method !== "null")
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, count]) => ({ label: PAYMENT_LABEL[method] || method, value: count, color: "#12808F" }))}
              />
            </Card>
          </div>
        </>
      )}
    </AdminShell>
  );
}
