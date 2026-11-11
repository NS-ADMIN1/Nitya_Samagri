"use client";

// apps/admin/app/coupons/page.tsx
//
// Coupons: the list on the left (filter, search, switch on/off) and the
// create / edit form on the right. The API returns all coupons in one go
// (up to 100), so filtering and search happen here in the browser.

import { useState } from "react";
import useSWR from "swr";
import CouponForm from "../../components/coupons/CouponForm";
import AdminShell from "../../components/layout/AdminShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Notice, { errorMessage } from "../../components/ui/Notice";
import SearchInput from "../../components/ui/SearchInput";
import StatusPill from "../../components/ui/StatusPill";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import Toggle from "../../components/ui/Toggle";
import { COUPON_STATE, couponsFetcher, couponState, COUPONS_URL, offerText, setCouponActive, type Coupon, type CouponState } from "../../lib/coupons";
import { formatCount, formatINR, formatWhen } from "../../lib/format";

const TAB_STATES: CouponState[] = ["active", "scheduled", "paused", "expired"];

function validity(c: Coupon): string {
  const state = couponState(c);
  if (state === "scheduled") return `Starts ${formatWhen(c.startsAt)}`;
  if (!c.expiresAt) return "No end date";
  return `${state === "expired" ? "Ended" : "Till"} ${new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function CouponsPage() {
  const { data, error, isLoading } = useSWR(COUPONS_URL, couponsFetcher, { shouldRetryOnError: false });
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const coupons = data || [];
  const editing = coupons.find((c) => c._id === editingId) || null;
  const countOf = (state: CouponState) => coupons.filter((c) => couponState(c) === state).length;

  const term = search.trim().toLowerCase();
  const rows = coupons.filter((c) => {
    if (tab !== "all" && couponState(c) !== tab) return false;
    if (term && !c.code.toLowerCase().includes(term) && !(c.desc || "").toLowerCase().includes(term)) return false;
    return true;
  });

  const tabs: TabItem[] = [
    { id: "all", label: "All", count: data ? coupons.length : undefined },
    ...TAB_STATES.map((state) => ({ id: state, label: COUPON_STATE[state].label, count: data ? countOf(state) : undefined })),
  ];

  const toggle = async (coupon: Coupon, next: boolean) => {
    setBusyId(coupon._id);
    setActionError("");
    try {
      await setCouponActive(coupon._id, next);
    } catch (e) {
      setActionError(`${coupon.code}: ${errorMessage(e, "changing coupons")}`);
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Coupon>[] = [
    {
      id: "code",
      header: "Code",
      cell: (c) => <span className="rounded-lg border border-dashed border-field bg-[#FBFBF9] px-2.5 py-1 font-mono text-[13px] font-bold tracking-[0.04em]">{c.code}</span>,
    },
    {
      id: "offer",
      header: "Offer",
      cell: (c) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{offerText(c)}</span>
          {c.desc && <span className="text-xs text-slate">{c.desc}</span>}
        </div>
      ),
    },
    { id: "min", header: "Min. order", cell: (c) => <span className="tabular-nums text-slate">{c.minOrderValue ? formatINR(c.minOrderValue) : "Any"}</span> },
    {
      id: "used",
      header: "Used",
      align: "right",
      cell: (c) => (
        <span className="font-semibold tabular-nums">
          {formatCount(c.usedCount)}
          {c.usageLimit ? <span className="font-normal text-slate"> of {formatCount(c.usageLimit)}</span> : null}
        </span>
      ),
    },
    { id: "valid", header: "Valid", cell: (c) => <span className="text-[13px] text-slate">{validity(c)}</span> },
    {
      id: "state",
      header: "Status",
      cell: (c) => {
        const state = COUPON_STATE[couponState(c)];
        return <StatusPill tone={state.tone}>{state.label}</StatusPill>;
      },
    },
    {
      id: "on",
      header: "On",
      cell: (c) => (
        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
          <Toggle checked={c.isActive} disabled={busyId === c._id} label={`Switch ${c.code} on or off`} onChange={(next) => toggle(c, next)} />
        </span>
      ),
    },
    {
      id: "edit",
      header: "Edit",
      align: "right",
      cell: (c) => (
        <Button
          variant="ghost"
          size="sm"
          icon="edit"
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(c._id);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const active = data ? countOf("active") : 0;
  const scheduled = data ? countOf("scheduled") : 0;

  return (
    <AdminShell
      title="Coupons"
      subtitle={data ? `${formatCount(active)} active · ${formatCount(scheduled)} scheduled` : "Discount codes customers can use at checkout"}
      actions={
        editing ? (
          <Button icon="plus" onClick={() => setEditingId(null)}>
            New coupon
          </Button>
        ) : undefined
      }
    >
      <Tabs label="Filter coupons" items={tabs} value={tab} onChange={setTab} />

      {actionError && <Notice tone="error">{actionError}</Notice>}

      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 xl:flex-[3]">
          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-3 px-4 pb-3.5 pt-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Search code or description" />
            </div>
            {error ? (
              <div className="px-4 pb-4">
                <Notice tone="error">{errorMessage(error, "coupons")}</Notice>
              </div>
            ) : (
              <DataTable
                caption="Coupons"
                columns={columns}
                rows={rows}
                rowKey={(c) => c._id}
                loading={isLoading}
                emptyText={term ? `No coupons match "${search.trim()}"` : tab === "all" ? "No coupons yet. Create the first one in the form." : "No coupons in this group"}
                selectedKey={editingId}
                onRowClick={(c) => setEditingId(c._id)}
              />
            )}
          </Card>
        </div>

        {!error && (
          <aside aria-label={editing ? "Edit coupon" : "Create coupon"} className="w-full min-w-0 xl:sticky xl:top-5 xl:flex-1 xl:basis-[380px]">
            <CouponForm coupon={editing} onDone={() => setEditingId(null)} />
          </aside>
        )}
      </div>
    </AdminShell>
  );
}