// apps/web/lib/orders.js
//
// How the backend's order statuses (backend/src/database/models/Order.ts)
// are worded and grouped for customers.

const STATUS = {
  pending:          { label: "Order placed",        group: "active" },
  confirmed:        { label: "Confirmed",           group: "active" },
  processing:       { label: "Being packed",        group: "active" },
  ready_for_pickup: { label: "Ready to ship",       group: "active" },
  shipped:          { label: "Shipped",             group: "active" },
  out_for_delivery: { label: "Out for delivery",    group: "active" },
  NDR:              { label: "Delivery attempted",  group: "active" },
  delivered:        { label: "Delivered",           group: "delivered" },
  cancelled:        { label: "Cancelled",           group: "closed" },
  returned:         { label: "Returned",            group: "closed" },
  refunded:         { label: "Refunded",            group: "closed" },
};

export function orderStatusLabel(status) {
  return STATUS[status]?.label || status || "";
}

// "active" | "delivered" | "closed"
export function orderStatusGroup(status) {
  return STATUS[status]?.group || "active";
}

// The backend refuses to cancel once an order has shipped
// (POST /orders/:orderId/cancel), so the button is only offered before that.
const CANCELLABLE = ["pending", "confirmed", "processing", "ready_for_pickup"];

export function canCancelOrder(status) {
  return CANCELLABLE.includes(status);
}

const PAYMENT_METHOD = {
  cod: "Cash on delivery",
  razorpay: "Paid online",
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  wallet: "Wallet",
};

export function paymentMethodLabel(method) {
  return PAYMENT_METHOD[method] || method || "";
}