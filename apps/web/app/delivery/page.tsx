"use client";

// apps/web/app/delivery/page.tsx — track one order.
//
//   /delivery?orderId=<id>   that order
//   /delivery                the customer's most recent order
//
// Data: GET /orders/:orderId (order, items and status timeline) and, when
// the courier has the parcel, GET /integrations/shipping/track/:orderId.
// Courier details are shown only if that call returns real values.

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch, isLoggedIn } from "../../lib/auth";
import { formatPrice } from "../../lib/format";
import { orderStatusLabel, paymentMethodLabel } from "../../lib/orders";
import { BRAND } from "../../lib/theme";
import Icon from "../../components/ui/Icon";
import StatusBadge from "../../components/ui/StatusBadge";

// The backend's order statuses (Order.ts) as the steps a customer sees.
// "ready_for_pickup" is still the packed step from the customer's side.
const STAGES = [
  { key: "pending", label: "Order placed" },
  { key: "confirmed", label: "Order confirmed" },
  { key: "processing", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];
const STAGE_ALIAS: Record<string, string> = { ready_for_pickup: "processing" };

// Statuses that are not a step on the way to delivery.
const EXCEPTIONS: Record<string, string> = {
  cancelled: "This order was cancelled.",
  returned: "This order was returned.",
  refunded: "This order was refunded.",
  NDR: "A delivery attempt was not successful. Please contact us if you need help with this order.",
};

type OrderItem = { productName: string; qty: number; price: number };
type TimelineEvent = { status: string; createdAt: string };
type AddressDoc = { fullName?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; phone?: string };
type AddressSnapshot = { name?: string; line1?: string; line2?: string; city?: string; state?: string; pin?: string };
type Order = {
  orderId: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  gst?: number;
  shipping?: number;
  discount?: number;
  total: number;
  address?: AddressSnapshot | null; // copied onto the order when it was placed
  addressId?: AddressDoc | null; // the saved address, if it still exists
  items?: OrderItem[];
  timeline?: TimelineEvent[];
};
type Tracking = { courierName?: string; awb?: string; currentLocation?: string };

type LoadState =
  | { kind: "loading" }
  | { kind: "loggedOut" }
  | { kind: "noOrders" }
  | { kind: "error"; message: string }
  | { kind: "ready"; order: Order };

function formatDateTime(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border border-line p-4 md:p-6">
      <h2 className="heading-display text-[22px] md:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Message({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="site-container flex flex-col items-start gap-4 py-14">
      <h1 className="heading-display text-[28px] md:text-[38px]">{title}</h1>
      <p className="text-slate">{text}</p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function Timeline({ order }: { order: Order }) {
  const stageKey = STAGE_ALIAS[order.status] || order.status;
  const current = STAGES.findIndex((s) => s.key === stageKey);

  return (
    <ol className="flex flex-col">
      {STAGES.map((stage, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        const isLast = i === STAGES.length - 1;
        const event = order.timeline?.find((t) => (STAGE_ALIAS[t.status] || t.status) === stage.key);
        const when = formatDateTime(event?.createdAt);

        return (
          <li key={stage.key} className="flex gap-4" aria-current={isCurrent ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${
                  isCurrent
                    ? "border-gold bg-gold text-navy"
                    : done
                      ? "border-navy bg-navy text-white"
                      : "border-field bg-white text-slate"
                }`}
              >
                {done ? <Icon name="check" size={18} /> : i + 1}
              </span>
              {!isLast && <span aria-hidden="true" className={`my-1 w-0.5 flex-1 ${i < current ? "bg-navy" : "bg-line"}`} />}
            </div>
            <div className={isLast ? "" : "pb-7"}>
              <p className={`text-[15px] ${done ? "font-semibold text-navy" : "font-medium text-slate"}`}>
                {stage.label}
                {done && !isCurrent && <span className="sr-only"> (completed)</span>}
              </p>
              {when && <p className="text-[13px] text-slate">{when}</p>}
              {isCurrent && <p className="text-[13px] font-semibold text-gold-ink">Current status</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [courier, setCourier] = useState<Tracking | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setState({ kind: "loggedOut" });
      return undefined;
    }

    let cancelled = false;
    setState({ kind: "loading" });
    setCourier(null);

    (async () => {
      try {
        let orderId = orderIdParam;
        if (!orderId) {
          // No order named in the link — show the most recent one.
          const { ok, body } = await apiFetch<{ data: { orders: Order[] } }>("/orders?limit=1");
          if (!ok) throw new Error(body.message || "We couldn't load your orders.");
          const latest = body.data.orders?.[0];
          if (!latest) {
            if (!cancelled) setState({ kind: "noOrders" });
            return;
          }
          orderId = latest.orderId;
        }

        const { ok, body } = await apiFetch<{ data: { order: Order } }>(`/orders/${encodeURIComponent(orderId)}`);
        if (cancelled) return;
        if (!ok) throw new Error(body.message || "We couldn't find that order.");
        setState({ kind: "ready", order: body.data.order });

        // Courier details are optional: the shipping partner may not have
        // the parcel yet. A failure just leaves the courier panel out.
        apiFetch<{ data: { tracking?: Tracking } }>(`/integrations/shipping/track/${encodeURIComponent(orderId)}`)
          .then(({ ok: trackOk, body: trackBody }) => {
            const tracking = trackOk ? trackBody.data?.tracking : null;
            if (!cancelled && tracking && (tracking.courierName || tracking.awb)) setCourier(tracking);
          })
          .catch(() => {});
      } catch (err) {
        if (!cancelled) {
          setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderIdParam]);

  if (state.kind === "loading") {
    return <div className="site-container py-16 text-center text-sm text-slate">Loading your order…</div>;
  }

  if (state.kind === "loggedOut") {
    const back = orderIdParam ? `/delivery?orderId=${encodeURIComponent(orderIdParam)}` : "/delivery";
    return (
      <Message title="Track your order" text="Please log in to see your order's status.">
        <Link href={`/login?next=${encodeURIComponent(back)}`} className="btn btn-gold">
          Log in
        </Link>
      </Message>
    );
  }

  if (state.kind === "noOrders") {
    return (
      <Message title="No orders yet" text="When you place an order, you can follow it here.">
        <Link href="/shop" className="btn btn-gold">
          Shop all products
        </Link>
      </Message>
    );
  }

  if (state.kind === "error") {
    return (
      <Message title="We couldn't show this order" text={state.message}>
        <Link href="/account" className="btn btn-navy">
          Go to my orders
        </Link>
      </Message>
    );
  }

  const { order } = state;
  const exception = EXCEPTIONS[order.status];
  const items = order.items || [];
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const paid = order.paymentStatus === "paid";

  // Prefer the address copied onto the order; fall back to the saved one.
  const snapshot = order.address;
  const saved = order.addressId;
  const addressName = snapshot?.name || saved?.fullName || "";
  const addressLines = [
    snapshot?.line1 || saved?.line1,
    snapshot?.line2 || saved?.line2,
    snapshot?.city || saved?.city,
    `${snapshot?.state || saved?.state || ""} ${snapshot?.pin || saved?.pincode || ""}`.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="border-b border-line bg-offwhite">
        <div className="site-container flex flex-wrap items-end justify-between gap-4 py-6 md:py-7">
          <div className="flex flex-col gap-1.5">
            <Link href="/account" className="inline-flex min-h-[32px] items-center gap-1 text-[13px] text-slate hover:text-navy">
              <Icon name="chevronLeft" size={14} />
              My orders
            </Link>
            <h1 className="heading-display text-[26px] md:text-[38px]">Order {order.orderId}</h1>
            <p className="text-sm text-slate">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="site-container flex flex-col gap-6 pb-14 pt-6 md:flex-row md:items-start md:gap-9 md:pb-[72px] md:pt-9">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {exception ? (
            <Panel title={orderStatusLabel(order.status)}>
              <p className="text-slate">{exception}</p>
              {order.status === "cancelled" && paid && (
                <p className="text-slate">
                  This order was paid online. For your refund, please write to{" "}
                  <a href={`mailto:${BRAND.email}`} className="font-semibold text-navy underline">
                    {BRAND.email}
                  </a>{" "}
                  with the order ID.
                </p>
              )}
            </Panel>
          ) : (
            <Panel title="Delivery status">
              <Timeline order={order} />
            </Panel>
          )}

          {courier && (
            <Panel title="Courier">
              <dl className="flex flex-col gap-2 text-sm">
                {courier.courierName && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate">Courier</dt>
                    <dd className="font-semibold">{courier.courierName}</dd>
                  </div>
                )}
                {courier.awb && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate">Tracking number (AWB)</dt>
                    <dd className="font-semibold">{courier.awb}</dd>
                  </div>
                )}
                {courier.currentLocation && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate">Last seen at</dt>
                    <dd className="font-semibold">{courier.currentLocation}</dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}
        </div>

        <div className="flex w-full flex-col gap-5 md:w-[380px] md:shrink-0">
          {addressLines && (
            <Panel title="Delivering to">
              <p className="text-sm leading-relaxed">
                {addressName && (
                  <>
                    <span className="font-semibold">{addressName}</span>
                    <br />
                  </>
                )}
                <span className="text-slate">{addressLines}</span>
                {saved?.phone && (
                  <>
                    <br />
                    <span className="text-slate">{saved.phone}</span>
                  </>
                )}
              </p>
            </Panel>
          )}

          <Panel title={`Items (${itemCount})`}>
            <ul className="flex flex-col gap-2.5 text-sm">
              {items.map((item, i) => (
                <li key={`${item.productName}-${i}`} className="flex justify-between gap-3">
                  <span>
                    {item.productName} <span className="text-slate">× {item.qty}</span>
                  </span>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
              {order.subtotal != null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Subtotal</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
              )}
              {order.gst != null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">GST</dt>
                  <dd>{formatPrice(order.gst)}</dd>
                </div>
              )}
              {order.shipping != null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Delivery</dt>
                  <dd>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd>
                </div>
              )}
              {!!order.discount && order.discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Coupon discount</dt>
                  <dd>− {formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 pt-1 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Payment</dt>
                  <dd>
                    {paymentMethodLabel(order.paymentMethod)}
                    {paid ? " · Paid" : ""}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          <section className="flex flex-col gap-3 rounded-md border border-line border-t-[3px] border-t-gold bg-offwhite p-4 md:p-6">
            <h2 className="text-base font-semibold">Need help with this order?</h2>
            <p className="text-sm text-slate">Tell us about a delay or a damaged item, or ask a question.</p>
            <a
              href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`Help with order ${order.orderId}`)}`}
              className="btn btn-navy"
            >
              Email support
            </a>
          </section>
        </div>
      </div>
    </>
  );
}

export default function DeliveryTrackingPage() {
  // useSearchParams needs a Suspense boundary so the page can still be
  // statically generated at build time.
  return (
    <Suspense fallback={<div className="site-container py-16 text-center text-sm text-slate">Loading your order…</div>}>
      <TrackingContent />
    </Suspense>
  );
}