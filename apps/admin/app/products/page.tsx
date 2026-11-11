"use client";

// apps/admin/app/products/page.tsx
//
// Products: the catalogue list (search, filter, show/hide on the store) and,
// when a row's Edit button is pressed, the edit form in place of the list.
// Adding a product has its own page at /products/new.

import { useEffect, useState } from "react";
import useSWR from "swr";
import AdminShell from "../../components/layout/AdminShell";
import ProductForm from "../../components/products/ProductForm";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Select } from "../../components/ui/Field";
import Notice, { errorMessage } from "../../components/ui/Notice";
import Pager from "../../components/ui/Pager";
import SearchInput from "../../components/ui/SearchInput";
import StatusPill, { type PillTone } from "../../components/ui/StatusPill";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import Toggle from "../../components/ui/Toggle";
import { formatCount, formatINR, plural } from "../../lib/format";
import { STOCK_LEVEL, stockLevel } from "../../lib/orderStatus";
import { productsFetcher, productsUrl, refName, setProductStatus, useCategories, type Product, type ProductStatus } from "../../lib/products";
import { getAdminSession } from "../../lib/adminAuth";

const LIMIT = 20;

// Each tab is either a status filter or a stock filter on the API.
const TAB_FILTER: Record<string, { status?: string; stockFilter?: string }> = {
  all: {},
  active: { status: "active" },
  draft: { status: "draft" },
  low: { stockFilter: "low" },
  out: { stockFilter: "out" },
  archived: { status: "archived" },
};

const STATUS_PILL: Record<ProductStatus, { label: string; tone: PillTone }> = {
  active: { label: "Active", tone: "green" },
  draft: { label: "Draft", tone: "grey" },
  archived: { label: "Archived", tone: "red" },
};

export default function ProductsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // `search`, applied after a short pause
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // The role is in localStorage, so it is only known after mount.
  const [role, setRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    setRole(getAdminSession()?.user?.role);
  }, []);
  const canEdit = role === "admin" || role === "super_admin"; // same rule as the API

  // Wait until typing stops before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, error, isLoading } = useSWR(
    productsUrl({ ...TAB_FILTER[tab], q: query || undefined, categoryId: categoryId || undefined, page, limit: LIMIT }),
    productsFetcher,
    { keepPreviousData: true, shouldRetryOnError: false },
  );
  const { data: categories } = useCategories();
  const products = data?.products || [];
  const stats = data?.stats;

  const tabs: TabItem[] = [
    { id: "all", label: "All", count: stats?.total },
    { id: "active", label: "Active", count: stats?.byStatus.active },
    { id: "draft", label: "Draft", count: stats?.byStatus.draft },
    { id: "low", label: "Low stock", count: stats?.lowStockCount },
    { id: "out", label: "Out of stock", count: stats?.outOfStockCount },
    { id: "archived", label: "Archived", count: stats?.byStatus.archived },
  ];

  const changeStatus = async (product: Product, status: ProductStatus) => {
    setBusyId(product._id);
    setActionError("");
    try {
      await setProductStatus(product._id, status);
    } catch (e) {
      setActionError(`${product.name}: ${errorMessage(e, "changing products")}`);
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
          <span className="font-semibold">
            {p.name}
            {p.isFeatured && (
              <span className="ml-2 align-middle">
                <StatusPill tone="gold" dot={false}>
                  Featured
                </StatusPill>
              </span>
            )}
          </span>
          <span className="text-xs text-slate">{p.sku}</span>
        </div>
      ),
    },
    { id: "category", header: "Category", cell: (p) => <span className="text-slate">{refName(p.categoryId) || "—"}</span> },
    {
      id: "price",
      header: "Price",
      align: "right",
      cell: (p) => (
        <span className="whitespace-nowrap">
          <span className="font-semibold tabular-nums">{formatINR(p.price)}</span>
          {p.mrp > p.price && <span className="ml-1.5 text-xs tabular-nums text-slate line-through">{formatINR(p.mrp)}</span>}
        </span>
      ),
    },
    {
      id: "stock",
      header: "In stock",
      cell: (p) => {
        const level = stockLevel(p.stock, p.lowStockAt);
        return (
          <span className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">{formatCount(p.stock)}</span>
            {level !== "ok" && <StatusPill tone={STOCK_LEVEL[level].tone}>{level === "low" ? "Low" : "Out"}</StatusPill>}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (p) => {
        const pill = STATUS_PILL[p.status] || STATUS_PILL.draft;
        return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>;
      },
    },
    {
      id: "store",
      header: "On store",
      cell: (p) =>
        p.status === "archived" ? (
          <Button variant="ghost" size="sm" icon="return" disabled={!canEdit} loading={busyId === p._id} onClick={() => changeStatus(p, "active")}>
            Restore
          </Button>
        ) : (
          <Toggle
            checked={p.status === "active"}
            disabled={!canEdit || busyId === p._id}
            label={`Show ${p.name} on the store`}
            onChange={(next) => changeStatus(p, next ? "active" : "draft")}
          />
        ),
    },
    {
      id: "edit",
      header: "Edit",
      align: "right",
      cell: (p) => (
        <Button variant="ghost" size="sm" icon="edit" disabled={!canEdit} onClick={() => setEditing(p)}>
          Edit
        </Button>
      ),
    },
  ];

  // ── Edit mode: the form replaces the list ───────────────────────────────
  if (editing) {
    return (
      <AdminShell title="Edit product" subtitle={`${editing.name} · ${editing.sku}`}>
        <ProductForm product={editing} canArchive={role === "super_admin"} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Products"
      subtitle={stats ? `${plural(stats.total, "product")} in the catalogue` : "Everything you sell on the store"}
      actions={
        canEdit ? (
          <Button icon="plus" href="/products/new">
            Add product
          </Button>
        ) : undefined
      }
    >
      <Tabs
        label="Filter products"
        items={tabs}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
      />

      {actionError && <Notice tone="error">{actionError}</Notice>}
      {role && !canEdit && <Notice>You can view products. Adding and editing is for Admins and Super Admins.</Notice>}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3.5 pt-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, description or tag" />
          <div className="w-full sm:w-[220px]">
            <Select
              aria-label="Category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {(categories || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error ? (
          <div className="px-4 pb-4">
            <Notice tone="error">{errorMessage(error, "products")}</Notice>
          </div>
        ) : (
          <>
            <DataTable
              caption="Products"
              columns={columns}
              rows={products}
              rowKey={(p) => p._id}
              loading={isLoading}
              emptyText={query ? `No products match "${query}"` : "No products here yet"}
            />
            <Pager page={page} limit={LIMIT} total={data?.pagination.total || 0} onPage={setPage} />
          </>
        )}
      </Card>
    </AdminShell>
  );
}