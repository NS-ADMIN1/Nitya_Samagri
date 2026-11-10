"use client";

// components/account/OrderCard.jsx — one order, expandable for details.

import { useState } from "react";
import Link from "next/link";
import { useAccountStore } from "../../lib/accountStore";
import { formatPrice } from "../../lib/format";
import { canCancelOrder, paymentMethodLabel } from "../../lib/orders";
import { BRAND } from "../../lib/theme";
import Icon from "../ui/Icon";
import StatusBadge from "../ui/StatusBadge";

function Line({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function OrderCard({ order, defaultOpen = false }) {
  const cancelOrder = useAccountStore((s) => s.cancelOrder);
  const [open, setOpen] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }

  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);
  const paidOnline = order.paymentStatus === "paid";
  const panelId = `order-${order.orderId}`;

  const cancel = async () => {
    setCancelling(true);
    setMessage(null);
    const res = await cancelOrder(order.orderId);
    setCancelling(false);
    setConfirming(false);
    setMessage(
      res.ok
        ? {
            ok: true,
            // The backend cancels and restocks but does not refund automatically.
            text: paidOnline
              ? `Order cancelled. You paid online, so please write to ${BRAND.email} with this order ID for your refund.`
              : "Order cancelled.",
          }
        : { ok: false, text: res.message }
    );
  };

  const a = order.address;

  return (
    <li className="rounded-md border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left md:px-5"
      >
        <span className="flex min-w-[150px] flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{order.orderId}</span>
          <span className="text-[13px] text-slate">
            {order.date} · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </span>
        <StatusBadge status={order.status} />
        <span className="min-w-[80px] text-right font-bold">{formatPrice(order.total)}</span>
        <Icon name="chevronRight" size={18} className={`text-slate transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line p-4 text-sm md:px-5">
          <ul className="flex flex-col gap-2">
            {order.items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex justify-between gap-3">
                <span>
                  {it.name} <span className="text-slate">× {it.qty}</span>
                </span>
                <span>{formatPrice(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-1.5 border-t border-mist pt-3">
            <Line label="Subtotal" value={formatPrice(order.subtotal)} />
            <Line label="GST" value={formatPrice(order.gst)} />
            <Line label="Delivery" value={order.shipping === 0 ? "Free" : formatPrice(order.shipping)} />
            {order.discount > 0 && <Line label="Coupon discount" value={`− ${formatPrice(order.discount)}`} />}
            <div className="flex justify-between gap-3 pt-1 font-bold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
            <Line
              label="Payment"
              value={`${paymentMethodLabel(order.paymentMethod)}${paidOnline ? " · Paid" : ""}`}
            />
          </dl>

          {a && (
            <p className="border-t border-mist pt-3 leading-relaxed text-slate">
              <span className="font-semibold text-navy">Delivering to {a.name}</span>
              <br />
              {[a.line1, a.line2, a.city, `${a.state || ""} ${a.pin || ""}`.trim()].filter(Boolean).join(", ")}
            </p>
          )}

          {message && (
            <p role={message.ok ? "status" : "alert"} className={`font-semibold ${message.ok ? "text-success" : "text-danger"}`}>
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            {order.status !== "cancelled" && (
              <Link
                href={`/delivery?orderId=${encodeURIComponent(order.orderId)}`}
                className="btn btn-navy min-h-[44px] px-4"
              >
                Track order
              </Link>
            )}
            {order.status === "delivered" && (
              <Link href="/reviews" className="btn btn-outline min-h-[44px] px-4">
                Write a review
              </Link>
            )}
            {canCancelOrder(order.status) && !confirming && (
              <button type="button" onClick={() => setConfirming(true)} className="btn btn-outline min-h-[44px] px-4">
                Cancel order
              </button>
            )}
          </div>

          {confirming && (
            <div className="flex flex-col gap-3 rounded border border-danger p-4">
              <p className="font-semibold">Cancel order {order.orderId}? This cannot be undone.</p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={cancel}
                  className="btn min-h-[44px] bg-danger px-4 text-white"
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel order"}
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setConfirming(false)}
                  className="btn btn-outline min-h-[44px] px-4"
                >
                  Keep order
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
