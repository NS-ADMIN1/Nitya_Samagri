// apps/web/lib/pricing.js
//
// Cart totals shown before an order exists. These MUST mirror how the
// backend prices an order (backend/src/modules/orders/order.routes.ts,
// POST /orders) — the backend's figure is the one that is charged, so if
// the rules there change, change them here too:
//
//   subtotal = Σ price × qty
//   gst      = Σ price × qty × gstPct%   (added on top; gstPct falls back to 5)
//   shipping = ₹49, free when subtotal ≥ ₹499
//   total    = round(subtotal + gst + shipping − coupon discount)
//
// Coupons are validated only by the backend when the order is placed, so
// no discount is estimated here.

export const SHIPPING_FEE = 49;
export const FREE_SHIPPING_FROM = 499;
const DEFAULT_GST_PCT = 5;

export function calcCartTotals(items) {
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const mrpTotal = items.reduce((sum, i) => sum + (i.mrp || i.price) * i.qty, 0);
  const gst = items.reduce((sum, i) => sum + (i.price * i.qty * (i.gstPct || DEFAULT_GST_PCT)) / 100, 0);
  const shipping = count === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;

  return {
    count,
    subtotal,
    savings: Math.max(0, mrpTotal - subtotal),
    gst: Math.round(gst),
    shipping,
    toFreeShipping: count > 0 && subtotal < FREE_SHIPPING_FROM ? FREE_SHIPPING_FROM - subtotal : 0,
    total: Math.round(subtotal + gst + shipping),
  };
}

export function cartItemKey(item) {
  return `${item.productId}:${item.variantId || ""}`;
}