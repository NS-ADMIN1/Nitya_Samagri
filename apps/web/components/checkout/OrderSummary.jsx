// components/checkout/OrderSummary.jsx
// Totals box shown beside every checkout step. `totals` comes from
// lib/pricing.js → calcCartTotals(). The action button is passed in as
// children so each step supplies its own.

import { formatPrice } from "../../lib/format";
import Icon from "../ui/Icon";
import CouponField from "./CouponField";

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "text-lg font-bold" : "text-sm"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function OrderSummary({ totals, couponCode, onCouponChange, busy = false, children }) {
  return (
    <aside
      aria-label="Order summary"
      className="flex w-full flex-col gap-4 rounded-md border border-line border-t-[3px] border-t-gold bg-offwhite p-5 md:sticky md:top-[150px] md:w-[380px] md:shrink-0 md:p-6"
    >
      <h2 className="heading-display text-2xl">Order Summary</h2>

      <CouponField code={couponCode} onChange={onCouponChange} disabled={busy} />

      <dl className="flex flex-col gap-2.5 border-t border-line pt-4">
        <Row label={`Subtotal (${totals.count} item${totals.count === 1 ? "" : "s"})`} value={formatPrice(totals.subtotal)} />
        <Row label="GST" value={formatPrice(totals.gst)} />
        <Row label="Delivery" value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)} />
        {couponCode && <Row label={`Coupon ${couponCode}`} value="Applied at order" />}
      </dl>

      <dl className="border-t border-navy pt-4">
        <Row label={couponCode ? "Total before coupon" : "Total"} value={formatPrice(totals.total)} strong />
      </dl>

      {totals.savings > 0 && (
        <p className="text-[13px] font-semibold text-success">You save {formatPrice(totals.savings)} on MRP.</p>
      )}
      {totals.toFreeShipping > 0 && (
        <p className="text-[13px] text-slate">Add {formatPrice(totals.toFreeShipping)} more for free delivery.</p>
      )}

      {children}

      <p className="flex items-center gap-2 text-[13px] text-slate">
        <Icon name="lock" size={16} />
        Payments are processed securely by Razorpay.
      </p>
    </aside>
  );
}
