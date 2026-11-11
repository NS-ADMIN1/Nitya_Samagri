"use client";

// apps/admin/app/inventory/page.tsx
//
// Inventory: every product's stock, lowest first. Change stock in one step
// from the row (type a quantity, press plus or minus), or open a product
// for an exact count, a note and its history. Every change is logged by
// the API with the staff member's name.

import { useEffect, useState } from "react";
import useSWR from "swr";
import StockPanel from "../../components/inventory/StockPanel";
import StockStepper from "../../components/inventory/StockStepper";
import AdminShell from "../../components/layout/AdminShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Notice, { errorMessage } from "../../components/ui/Notice";
import Pager from "../../components/ui/Pager";
import SearchInput from "../../components/ui/SearchInput";
import StatusPill from "../../components/ui/StatusPill";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import { formatCount } from "../../lib/format";
import { adjustStock, type StockOperation } from "../../lib/inventory";
import { STOCK_LEVEL, stockLevel } from "../../lib/orderStatus";
import { productsFetcher, productsUrl, type Product } from "../../lib/products";

const LIMIT = 25;
const LEVEL_COLOR = { ok: "#1A6337", low: "#C2600F", out: "#951B1B" };

/** A bar showing stock against three times the alert level (full bar = comfortably stocked). */
function StockBar({ product }: { product: Product }) {
  const level = stockLevel(product.stock, product.lowStockAt);
  const full = Math.max(1, product.lowStockAt * 3);
  const width = Math.max(2, Math.min(100, (product.stock / full) * 100));
  return (
    <div className="flex min-w-[150px] items-center gap-2.5">
      <span className="w-10 text-right font-bold tabular-nums">{formatCount(product.stock)}</span>
      <div className="h-2 flex-1 rounded-full bg-mist">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: LEVEL_COLOR[level] }} />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // `search`, applied after a short pause
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Wait until typing stops before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, isLoading } = useSWR(
    productsUrl({ stockFilter: tab, q: query || undefined, page, limit: LIMIT, sortBy: "stock", sortOrder: "asc" }),
    productsFetcher,
    { keepPreviousData: true, shouldRetryOnError: false },
  );
  const products = data?.products || [];
  const stats = data?.stats;
  const openProduct = products.find((p) => p._id === openId) || null;

  const tabs: TabItem[] = [
    { id: "all", label: "All", count: stats?.total },
    { id: "low", label: "Low stock", count: stats?.lowStockCount },
    { id: "out", label: "Out of stock", count: stats?.outOfStockCount },
    { id: "in", label: "In stock", count: stats ? stats.total - stats.outOfStockCount : undefined },
  ];

  const quickAdjust = async (product: Product, operation: StockOperation, quantity: number) => {
    setBusyId(product._id);
    setActionError("");
    try {
      await adjustStock(product._id, operation, quantity);
    } catch (e) {
      setActionError(`${product.name}: ${errorMessage(e, "changing stock")}`);
      throw e; // keeps the typed quantity in the row so it can be corrected
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Product>[] = [
    {
      id: "product",
      header: "Product",
      cell: (p) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{p.name}</span>
          <span className="text-xs text-slate">{p.sku}</span>
        </div>
      ),
    },
    { id: "stock", header: "In stock", cell: (p) => <StockBar product={p} /> },
    { id: "alert", header: "Alert at", cell: (p) => <span className="tabular-nums text-slate">{formatCount(p.lowStockAt)}</span> },
    {
      id: "status",
      header: "Status",
      cell: (p) => {
        const level = STOCK_LEVEL[stockLevel(p.stock, p.lowStockAt)];
        return <StatusPill tone={level.tone}>{level.label}</StatusPill>;
      },
    },
    {
      id: "adjust",
      header: "Add or remove",
      align: "right",
      cell: (p) => (
        <StockStepper productName={p.name} stock={p.stock} busy={busyId === p._id} onAdjust={(operation, quantity) => quickAdjust(p, operation, quantity)} />
      ),
    },
    {
      id: "open",
      header: "History",
      align: "right",
      cell: (p) => (
        <Button
          variant="quiet"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(p._id === openId ? null : p._id);
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  const needRestock = stats ? stats.lowStockCount + stats.outOfStockCount : 0;

  return (
    <AdminShell
      title="Inventory"
      subtitle={needRestock > 0 ? `${formatCount(needRestock)} products need restocking · lowest stock is listed first` : "Type a quantity in a row, then press plus or minus"}
    >
      <Tabs
        label="Filter products by stock"
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
              <SearchInput value={search} onChange={setSearch} placeholder="Search by product name or tag" />
            </div>
            {error ? (
              <div className="px-4 pb-4">
                <Notice tone="error">{errorMessage(error, "inventory")}</Notice>
              </div>
            ) : (
              <>
                <DataTable
                  caption="Inventory"
                  columns={columns}
                  rows={products}
                  rowKey={(p) => p._id}
                  loading={isLoading}
                  emptyText={query ? `No products match "${query}"` : "No products in this group"}
                  selectedKey={openId}
                  onRowClick={(p) => setOpenId(p._id === openId ? null : p._id)}
                />
                <Pager page={page} limit={LIMIT} total={data?.pagination.total || 0} onPage={setPage} />
              </>
            )}
          </Card>
        </div>

        {openProduct && (
          <aside aria-label="Stock details" className="w-full min-w-0 xl:sticky xl:top-5 xl:flex-1 xl:basis-[360px]">
            <StockPanel product={openProduct} onClose={() => setOpenId(null)} />
          </aside>
        )}
      </div>
    </AdminShell>
  );
}