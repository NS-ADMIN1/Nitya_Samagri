"use client";

// apps/admin/components/orders/OrdersTable.tsx
//
// The orders list used on the Orders page and on the Dashboard. Each row
// has one button: the next thing to do with that order.

import { formatINR, formatWhen, plural } from "../../lib/format";
import { customerName, NEXT_STEP, paymentLabel, type AdminOrder, type NextStep } from "../../lib/orders";
import { orderStatusMeta } from "../../lib/orderStatus";
import Button from "../ui/Button";
import DataTable, { type Column } from "../ui/DataTable";
import StatusPill from "../ui/StatusPill";

interface OrdersTableProps {
  orders: AdminOrder[];
  loading?: boolean;
  emptyText?: string;
  /** Order (by orderId) currently open in the detail panel. */
  selectedId?: string | null;
  onOpen: (order: AdminOrder) => void;
  /** Runs the row's next step. Leave out to show only a "View" button. */
  onAdvance?: (order: AdminOrder, step: NextStep) => void;
  /** orderId of the row whose status is being saved right now. */
  busyId?: string | null;
}

export default function OrdersTable({ orders, loading, emptyText, selectedId, onOpen, onAdvance, busyId }: OrdersTableProps) {
  const columns: Column<AdminOrder>[] = [
    { id: "order", header: "Order", cell: (o) => <span className="font-semibold">{o.orderId}</span> },
    {
      id: "customer",
      header: "Customer",
      cell: (o) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{customerName(o)}</span>
          <span className="text-xs text-slate">{o.address?.city || o.userId?.phone || "—"}</span>
        </div>
      ),
    },
    { id: "items", header: "Items", cell: (o) => plural(o.items?.length || 0, "item") },
    { id: "total", header: "Total", align: "right", cell: (o) => <span className="font-semibold tabular-nums">{formatINR(o.total)}</span> },
    { id: "payment", header: "Payment", cell: (o) => <span className="text-slate">{paymentLabel(o)}</span> },
    {
      id: "status",
      header: "Status",
      cell: (o) => {
        const meta = orderStatusMeta(o.status);
        return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
      },
    },
    { id: "placed", header: "Placed", cell: (o) => <span className="text-[13px] text-slate">{formatWhen(o.createdAt)}</span> },
    {
      id: "next",
      header: "Next step",
      align: "right",
      cell: (o) => {
        const step = onAdvance ? NEXT_STEP[o.status] : undefined;
        if (!step) {
          return (
            <Button
              variant="quiet"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(o);
              }}
            >
              View
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            loading={busyId === o.orderId}
            onClick={(e) => {
              e.stopPropagation();
              // Shipping needs courier details, which are filled in the detail panel.
              if (step.needsTracking) onOpen(o);
              else onAdvance?.(o, step);
            }}
          >
            {step.label}
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Orders"
      columns={columns}
      rows={orders}
      rowKey={(o) => o.orderId}
      loading={loading}
      emptyText={emptyText || "No orders here"}
      selectedKey={selectedId}
      onRowClick={onOpen}
    />
  );
}
