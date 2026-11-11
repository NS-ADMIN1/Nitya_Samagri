"use client";

// apps/admin/components/orders/OrderDetailPanel.tsx
//
// Everything about one order, with the buttons to move it forward. Opens
// beside the list on the Orders page. Loads GET /orders/:orderId for the
// items and the status history.

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatDateTime, formatINR } from "../../lib/format";
import {
  CANCELLABLE,
  customerName,
  NEXT_STEP,
  orderDetailFetcher,
  paymentLabel,
  updateOrderStatus,
  type AdminOrder,
  type StatusChange,
} from "../../lib/orders";
import { orderStatusMeta } from "../../lib/orderStatus";
import Button from "../ui/Button";
import Card from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import StatusPill from "../ui/StatusPill";

interface OrderDetailPanelProps {
  /** The row that was opened; shown straight away while the full order loads. */
  summary: AdminOrder;
  onClose: () => void;
}

type Confirming = null | "cancelled" | "returned";

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${strong ? "text-[15px]" : "text-sm"}`}>
      <span className={strong ? "text-navy" : "text-slate"}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mb-2 font-sans text-[13px] font-semibold text-navy">{children}</h3>;
}

export default function OrderDetailPanel({ summary, onClose }: OrderDetailPanelProps) {
  const { data: detail, error: loadError } = useSWR(`/api/v1/orders/${encodeURIComponent(summary.orderId)}`, orderDetailFetcher);
  const order = detail || summary;
  const items = order.items || [];

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [shipping, setShipping] = useState(false);
  const [courierName, setCourierName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");

  // Start clean whenever a different order is opened.
  useEffect(() => {
    setError("");
    setConfirming(null);
    setShipping(false);
    setCourierName("");
    setTrackingNo("");
  }, [summary.orderId]);

  const status = orderStatusMeta(order.status);
  const step = NEXT_STEP[order.status];
  const canCancel = CANCELLABLE.includes(order.status);
  const canReturn = order.status === "delivered";

  const change = async (next: StatusChange) => {
    setSaving(true);
    setError("");
    try {
      await updateOrderStatus(order.orderId, next);
      setConfirming(null);
      setShipping(false);
    } catch (e) {
      setError(errorMessage(e, "this order"));
    } finally {
      setSaving(false);
    }
  };

  const runStep = () => {
    if (!step) return;
    if (step.needsTracking) setShipping(true);
    else change({ status: step.status });
  };

  const submitShipping = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!courierName.trim() || !trackingNo.trim()) {
      setError("Enter the courier name and the tracking number to mark this order as shipped.");
      return;
    }
    change({ status: "shipped", courierName: courierName.trim(), trackingNo: trackingNo.trim() });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">Order</div>
          <div className="text-xl font-bold tracking-[-0.01em] text-navy">{order.orderId}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <button
            type="button"
            aria-label="Close order details"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-slate hover:bg-mist"
          >
            <Icon name="close" />
          </button>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-2.5">
        {error && <Notice tone="error">{error}</Notice>}

        {shipping ? (
          <form onSubmit={submitShipping} className="flex flex-col gap-3 rounded-xl border border-line bg-offwhite p-3.5">
            <Field id="ship-courier" label="Courier name">
              <Input id="ship-courier" value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. Delhivery" />
            </Field>
            <Field id="ship-tracking" label="Tracking number" helper="Sent to the customer by SMS">
              <Input id="ship-tracking" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="AWB / tracking number" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" icon="truck" loading={saving} fullWidth>
                Mark as shipped
              </Button>
              <Button variant="ghost" onClick={() => setShipping(false)} disabled={saving}>
                Back
              </Button>
            </div>
          </form>
        ) : confirming ? (
          <div className="flex flex-col gap-3 rounded-xl border border-danger-line bg-danger-soft p-3.5">
            <p className="text-sm text-navy">
              {confirming === "cancelled"
                ? "Cancel this order? The items go back into stock and this cannot be undone."
                : "Mark this order as returned? The items go back into stock."}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" loading={saving} onClick={() => change({ status: confirming })} fullWidth>
                {confirming === "cancelled" ? "Yes, cancel order" : "Yes, mark returned"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(null)} disabled={saving}>
                Keep
              </Button>
            </div>
          </div>
        ) : (
          <>
            {step && (
              <Button icon={step.needsTracking ? "truck" : "check"} loading={saving} onClick={runStep} fullWidth>
                {step.label}
              </Button>
            )}
            <div className="flex flex-wrap gap-2.5">
              {order.status === "processing" && (
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => change({ status: "ready_for_pickup" })}>
                  Ready for pickup
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" size="sm" disabled={saving} onClick={() => setConfirming("cancelled")}>
                  Cancel order
                </Button>
              )}
              {canReturn && (
                <Button variant="ghost" size="sm" icon="return" disabled={saving} onClick={() => setConfirming("returned")}>
                  Mark returned
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <hr className="my-4 border-0 border-t border-line" />

      {/* ── Items ───────────────────────────────────────────────────────── */}
      <SectionTitle>{`Items (${items.length})`}</SectionTitle>
      <ul className="flex flex-col">
        {items.map((item, i) => (
          <li key={item._id || `${item.productName}-${i}`} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{item.productName}</div>
              <div className="text-xs text-slate">
                Qty {item.qty}
                {item.sku ? ` · ${item.sku}` : ""}
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatINR(item.total ?? item.price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-2.5">
        <Row label="Subtotal" value={formatINR(order.subtotal)} />
        {order.gst > 0 && <Row label="GST" value={formatINR(order.gst)} />}
        <Row label="Delivery" value={order.shipping > 0 ? formatINR(order.shipping) : "Free"} />
        {order.discount > 0 && <Row label="Discount" value={`− ${formatINR(order.discount)}`} />}
        <Row label={order.paymentMethod === "cod" && order.paymentStatus !== "paid" ? "Collect on delivery" : "Total"} value={formatINR(order.total)} strong />
        <div className="pt-1 text-xs text-slate">{paymentLabel(order)}</div>
      </div>

      <hr className="my-4 border-0 border-t border-line" />

      {/* ── Delivery ────────────────────────────────────────────────────── */}
      <SectionTitle>Deliver to</SectionTitle>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-start gap-2.5">
          <Icon name="pin" size={17} className="mt-0.5 text-slate" />
          <span>
            {order.address?.name || customerName(order)}
            {order.address && (
              <span className="block text-slate">
                {[order.address.line1, order.address.line2, order.address.city, order.address.state].filter(Boolean).join(", ")} {order.address.pin}
              </span>
            )}
          </span>
        </div>
        {summary.userId?.phone && (
          <div className="flex items-center gap-2.5">
            <Icon name="phone" size={17} className="text-slate" />
            <a href={`tel:${summary.userId.phone}`} className="font-medium text-navy underline">
              {summary.userId.phone}
            </a>
          </div>
        )}
        {order.trackingNo && (
          <div className="flex items-center gap-2.5">
            <Icon name="truck" size={17} className="text-slate" />
            <span>
              {order.courierName || "Courier"} · {order.trackingNo}
            </span>
          </div>
        )}
        {order.notes && <p className="rounded-[10px] bg-mist px-3 py-2 text-[13px] text-slate">Customer note: {order.notes}</p>}
      </div>

      <hr className="my-4 border-0 border-t border-line" />

      {/* ── History ─────────────────────────────────────────────────────── */}
      <SectionTitle>History</SectionTitle>
      {loadError ? (
        <Notice tone="error">{errorMessage(loadError, "this order's history")}</Notice>
      ) : !detail ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : detail.timeline.length === 0 ? (
        <p className="text-sm text-slate">No history recorded yet.</p>
      ) : (
        <ol className="flex flex-col">
          {detail.timeline.map((entry, i) => {
            const last = i === detail.timeline.length - 1;
            return (
              <li key={entry._id || i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-navy text-white">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                  {!last && <span className="min-h-[18px] w-0.5 flex-1 bg-navy" />}
                </div>
                <div className="pb-3.5">
                  <div className="text-sm font-semibold">{orderStatusMeta(entry.status).label}</div>
                  <div className="text-xs text-slate">{formatDateTime(entry.createdAt)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
