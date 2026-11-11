"use client";

// apps/admin/app/customers/page.tsx
//
// Customers: who has signed up, how much they have ordered, and how to
// reach them. Read-only for now — the API (GET /auth/admin/users) has no
// endpoint yet to block or edit a customer from here.

import { useEffect, useState } from "react";
import useSWR from "swr";
import AdminShell from "../../components/layout/AdminShell";
import Avatar from "../../components/ui/Avatar";
import Card from "../../components/ui/Card";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Notice, { errorMessage } from "../../components/ui/Notice";
import Pager from "../../components/ui/Pager";
import SearchInput from "../../components/ui/SearchInput";
import StatusPill, { type PillTone } from "../../components/ui/StatusPill";
import { formatCount, formatINR, formatWhen, plural } from "../../lib/format";
import type { Pagination } from "../../lib/orders";
import { api } from "../../lib/api";

interface Customer {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
  loyaltyTier?: string;
  createdAt: string;
  orders: number;
  spend: number;
  lastOrder?: string;
}

const LIMIT = 25;
const fetcher = (url: string) => api.get<{ data: { users: Customer[]; pagination: Pagination } }>(url).then((r) => r.data);

const TIER: Record<string, { label: string; tone: PillTone }> = {
  bronze: { label: "New", tone: "grey" },
  silver: { label: "Silver", tone: "navy" },
  gold: { label: "Gold", tone: "gold" },
  platinum: { label: "Platinum", tone: "violet" },
};

const COLUMNS: Column<Customer>[] = [
  {
    id: "customer",
    header: "Customer",
    cell: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={c.name} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{c.name || "No name yet"}</span>
          <span className="text-xs text-slate">Joined {formatWhen(c.createdAt)}</span>
        </div>
      </div>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    cell: (c) => (
      <div className="flex flex-col gap-0.5">
        <span>{c.phone || "—"}</span>
        {c.email && <span className="text-xs text-slate">{c.email}</span>}
      </div>
    ),
  },
  { id: "orders", header: "Orders", align: "right", cell: (c) => <span className="font-semibold tabular-nums">{formatCount(c.orders)}</span> },
  { id: "spend", header: "Total spent", align: "right", cell: (c) => <span className="font-semibold tabular-nums">{formatINR(c.spend)}</span> },
  { id: "last", header: "Last order", cell: (c) => <span className="text-[13px] text-slate">{c.lastOrder ? formatWhen(c.lastOrder) : "No orders yet"}</span> },
  {
    id: "tier",
    header: "Loyalty",
    cell: (c) => {
      const tier = TIER[c.loyaltyTier || "bronze"] || TIER.bronze;
      return (
        <StatusPill tone={tier.tone} dot={false}>
          {tier.label}
        </StatusPill>
      );
    },
  },
  {
    id: "status",
    header: "Account",
    cell: (c) => (c.status === "blocked" ? <StatusPill tone="red">Blocked</StatusPill> : <StatusPill tone="green">Active</StatusPill>),
  },
];

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Wait until typing stops before asking the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(query ? { q: query } : {}) }).toString();
  const { data, error, isLoading } = useSWR(`/api/v1/auth/admin/users?${qs}`, fetcher, { keepPreviousData: true, shouldRetryOnError: false });
  const total = data?.pagination.total || 0;

  return (
    <AdminShell title="Customers" subtitle={data ? `${plural(total, "customer")}${query ? ` matching "${query}"` : " signed up"}` : "Everyone who has signed up on the store"}>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 px-4 pb-3.5 pt-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone or email" />
        </div>
        {error ? (
          <div className="px-4 pb-4">
            <Notice tone="error">{errorMessage(error, "customers")}</Notice>
          </div>
        ) : (
          <>
            <DataTable
              caption="Customers"
              columns={COLUMNS}
              rows={data?.users || []}
              rowKey={(c) => c._id}
              loading={isLoading}
              emptyText={query ? `No customers match "${query}"` : "No customers have signed up yet"}
            />
            <Pager page={page} limit={LIMIT} total={total} onPage={setPage} />
          </>
        )}
      </Card>
    </AdminShell>
  );
}
