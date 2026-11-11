"use client";

// apps/admin/app/orders/page.tsx
//
// Orders: filter by stage, find an order, and move it to its next step.
// Filtering, search and paging are done by the API (GET /orders/admin/all).
// Links from the Dashboard can preselect a tab (?status=pending) or open
// one order (?open=NS-…).

import { useEffect, useState } from "react";
import useSWR from "swr";
import AdminShell from "../../components/layout/AdminShell";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import OrdersTable from "../../components/orders/OrdersTable";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { Select } from "../../components/ui/Field";
import Notice, { errorMessage } from "../../components/ui/Notice";
import Pager from "../../components/ui/Pager";
import SearchInput from "../../components/ui/SearchInput";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import { formatCount } from "../../lib/format";
import {
  customerName,
  ordersFetcher,
  ordersUrl,
  paymentLabel,
  updateOrderStatus,
  useOrderCount,
  type AdminOrder,
  type NextStep,
} from "../../lib/orders";
import { ORDER_STATUS, orderStatusMeta } from "../../lib/orderStatus";

const LIMIT = 20;
const TAB_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "NDR", "cancelled"];

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Saves the orders currently on screen as a CSV file. */
function downloadCsv(orders: AdminOrder[]) {
  const header = ["Order", "Customer", "Phone", "City", "Items", "Total", "Payment", "Status", "Placed"];
  const lines = orders.map((o) =>
    [
      o.orderId,
      customerName(o),
      o.userId?.phone || "",
      o.address?.city || "",
      o.items?.length || 0,
      o.total,
      paymentLabel(o),
      orderStatusMeta(o.status).label,
      new Date(o.createdAt).toLocaleString("en-IN"),
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function OrdersPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // `search`, applied after a short pause
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Pick up ?status= and ?open= from Dashboard links (read once, on mount).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status && TAB_STATUSES.includes(status)) setTab(status);
    const open = params.get("open");
    if (open) {
      setOpenId(open);
      setSearch(open);
      setQuery(open);
    }
  }, []);

  // Wait until typing stops before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, isLoading } = useSWR(
    ordersUrl({ status: tab === "all" ? undefined : tab, q: query || undefined, payment: payment || undefined, page, limit: LIMIT }),
    ordersFetcher,
    { keepPreviousData: true, shouldRetryOnError: false },
  );
  const orders = data?.orders || [];
  const total = data?.pagination.total || 0;
  const openOrder = orders.find((o) => o.orderId === openId) || null;

  const counts: Record<string, number | undefined> = {
    pending: useOrderCount("pending"),
    confirmed: useOrderCount("confirmed"),
    processing: useOrderCount("processing"),
  };
  const tabs: TabItem[] = [
    { id: "all", label: "All" },
    ...TAB_STATUSES.map((status) => ({ id: status, label: ORDER_STATUS[status].label, count: counts[status] })),
  ];
  const needAction = (counts.pending || 0) + (counts.confirmed || 0);

  const advance = async (order: AdminOrder, step: NextStep) => {
    setBusyId(order.orderId);
    setActionError("");
    try {
      await updateOrderStatus(order.orderId, { status: step.status });
    } catch (e) {
      setActionError(`${order.orderId}: ${errorMessage(e, "this order")}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      title="Orders"
      subtitle={needAction > 0 ? `${formatCount(needAction)} need action now` : "Confirm, pack and ship customer orders"}
      actions={
        <Button variant="ghost" icon="download" disabled={orders.length === 0} onClick={() => downloadCsv(orders)}>
          Export this list
        </Button>
      }
    >
      <Tabs
        label="Filter orders by stage"
        items={tabs}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
      />

      {actionError && <Notice tone="error">{actionError}</Notice>}

      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 xl:flex-[3]">
          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-3 px-4 pb-3.5 pt-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by order ID, customer or phone" />
              <div className="w-full sm:w-[190px]">
                <Select
                  aria-label="Payment type"
                  value={payment}
                  onChange={(e) => {
                    setPayment(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All payments</option>
                  <option value="upi">UPI</option>
                  <option value="cod">Cash on delivery</option>
                  <option value="card">Card</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="netbanking">Net banking</option>
                  <option value="wallet">Wallet</option>
                </Select>
              </div>
            </div>
            {error ? (
              <div className="px-4 pb-4">
                <Notice tone="error">{errorMessage(error, "orders")}</Notice>
              </div>
            ) : (
              <>
                <OrdersTable
                  orders={orders}
                  loading={isLoading}
                  emptyText={query ? `No orders match "${query}"` : "No orders in this stage"}
                  selectedId={openId}
                  onOpen={(order) => setOpenId(order.orderId === openId ? null : order.orderId)}
                  onAdvance={advance}
                  busyId={busyId}
                />
                <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />
              </>
            )}
          </Card>
        </div>

        {openOrder && (
          <aside aria-label="Order details" className="w-full min-w-0 xl:sticky xl:top-5 xl:flex-1 xl:basis-[360px]">
            <OrderDetailPanel summary={openOrder} onClose={() => setOpenId(null)} />
          </aside>
        )}
      </div>
    </AdminShell>
  );
}