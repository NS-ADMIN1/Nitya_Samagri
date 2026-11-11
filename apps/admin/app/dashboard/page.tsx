"use client";

// apps/admin/app/dashboard/page.tsx
//
// The first screen after login: what needs doing today, then the headline
// numbers. Each block loads on its own and hides itself when the signed-in
// role has no access to that data, so every staff member gets a useful page.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import BarList from "../../components/dashboard/BarList";
import KpiCard from "../../components/dashboard/KpiCard";
import LowStockList from "../../components/dashboard/LowStockList";
import TaskCard from "../../components/dashboard/TaskCard";
import AdminShell from "../../components/layout/AdminShell";
import OrdersTable from "../../components/orders/OrdersTable";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import Notice, { errorMessage } from "../../components/ui/Notice";
import { formatCount, formatINR, formatINRShort } from "../../lib/format";
import { ordersFetcher, ordersUrl, useOrderCount } from "../../lib/orders";
import { ORDER_STATUS } from "../../lib/orderStatus";
import { monthAverageOrder, useOrderStats, useStockCounts } from "../../lib/stats";
import { getAdminSession } from "../../lib/adminAuth";

// Open orders, in the order they move through the shop.
const PIPELINE: { status: string; color: string }[] = [
  { status: "pending", color: "#D6AF43" },
  { status: "confirmed", color: "#3D6FD1" },
  { status: "processing", color: "#6A58C9" },
  { status: "ready_for_pickup", color: "#7B4BB3" },
  { status: "shipped", color: "#12808F" },
  { status: "out_for_delivery", color: "#0B5964" },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();

  // The session is in localStorage, so the name is only known after mount.
  const [firstName, setFirstName] = useState("");
  useEffect(() => {
    setFirstName((getAdminSession()?.user?.name || "").trim().split(/\s+/)[0] || "");
  }, []);

  const toConfirm = useOrderCount("pending");
  const toPack = useOrderCount("confirmed");
  const failed = useOrderCount("NDR");
  const stock = useStockCounts();
  const { data: stats } = useOrderStats();
  const {
    data: latest,
    error: latestError,
    isLoading: latestLoading,
  } = useSWR(ordersUrl({ limit: 6 }), ordersFetcher, { shouldRetryOnError: false });

  const lowAndOut = stock ? stock.lowStockCount + stock.outOfStockCount : undefined;
  const average = stats ? monthAverageOrder(stats) : undefined;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <AdminShell title={firstName ? `${greeting()}, ${firstName}` : greeting()} subtitle={`${today} · Here is what needs you today`}>
      <section aria-label="Needs your attention">
        <div className="mb-3.5">
          <h2 className="font-sans text-base font-semibold tracking-[-0.01em] text-navy">Needs your attention</h2>
          <p className="mt-0.5 text-[13px] text-slate">Start here. Each card opens the exact list to work through.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TaskCard icon="check" tone="gold" count={toConfirm} label="Orders to confirm" hint="New orders waiting for a yes" cta="Review orders" href="/orders?status=pending" />
          <TaskCard icon="orders" tone="blue" count={toPack} label="Orders to pack" hint="Confirmed and ready for packing" cta="Start packing" href="/orders?status=confirmed" />
          <TaskCard
            icon="alert"
            tone="orange"
            count={lowAndOut}
            label="Low stock items"
            hint={stock ? `${formatCount(stock.outOfStockCount)} already out of stock` : "At or below the alert level"}
            cta="Restock"
            href="/inventory"
          />
          <TaskCard icon="truck" tone="red" count={failed} label="Failed deliveries" hint="Courier could not deliver" cta="Follow up" href="/orders?status=NDR" />
        </div>
      </section>

      {stats && (
        <section aria-label="Store numbers" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Orders today" value={formatCount(stats.todayOrders)} note="Since midnight" />
          <KpiCard label="Revenue this month" value={formatINRShort(stats.monthRevenue)} note="Paid orders only" />
          <KpiCard label="Average order value" value={average === undefined ? "—" : formatINR(Math.round(average))} note="Paid orders this month" />
          <KpiCard label="Orders so far" value={formatCount(stats.totalOrders)} note="All time" />
        </section>
      )}

      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 xl:flex-[2]">
          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader
                title="Latest orders"
                subtitle="Newest first"
                action={
                  <Button variant="quiet" size="sm" href="/orders">
                    View all orders
                  </Button>
                }
              />
            </div>
            {latestError ? (
              <div className="px-5 pb-5">
                <Notice tone="info">{errorMessage(latestError, "orders")}</Notice>
              </div>
            ) : (
              <OrdersTable
                orders={latest?.orders || []}
                loading={latestLoading}
                emptyText="No orders yet"
                onOpen={(order) => router.push(`/orders?open=${encodeURIComponent(order.orderId)}`)}
              />
            )}
          </Card>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-5 xl:flex-1">
          {stats && (
            <Card>
              <CardHeader title="Order pipeline" subtitle="Open orders by stage" />
              <BarList
                emptyText="No open orders right now"
                items={PIPELINE.filter((p) => (stats.statusCounts[p.status] || 0) > 0).map((p) => ({
                  label: ORDER_STATUS[p.status].label,
                  value: stats.statusCounts[p.status],
                  color: p.color,
                }))}
              />
            </Card>
          )}
          <LowStockList />
        </div>
      </div>
    </AdminShell>
  );
}