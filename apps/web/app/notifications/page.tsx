"use client";

// apps/web/app/notifications/page.tsx — live order and payment updates.
//
// Updates arrive over the WebSocket in lib/ws.ts while this page is open.
// The backend keeps no notification history (there is no REST endpoint for
// it), so the page says so plainly and points to My Orders for anything
// older. Only events the storefront actually receives are handled.

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLoggedIn } from "../../lib/auth";
import { formatPrice } from "../../lib/format";
import { orderStatusLabel } from "../../lib/orders";
import { connectNotifications } from "../../lib/ws";
import type { WsMessage } from "../../lib/ws";
import Icon from "../../components/ui/Icon";

type Kind = "order" | "payment";
type Notification = {
  id: string;
  kind: Kind;
  title: string;
  message: string;
  orderId: string;
  time: string; // clock time it arrived, e.g. "3:42 pm"
  read: boolean;
};
type ConnectionStatus = "connecting" | "open" | "error" | "closed";
type Filter = "all" | Kind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "order", label: "Orders" },
  { id: "payment", label: "Payments" },
];

let sequence = 0;

// Backend WsEventType (backend/src/websocket/ws.server.ts) → what the
// customer reads. Admin-only events return null and are ignored.
function toNotification(msg: WsMessage): Notification | null {
  const payload = msg.payload as { orderId?: unknown; status?: unknown; amount?: unknown; reason?: unknown };
  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  const orderText = orderId ? `Order ${orderId}` : "Your order";

  let kind: Kind;
  let title: string;
  let message: string;

  switch (msg.event) {
    case "ORDER_CONFIRMED":
      kind = "order";
      title = "Order confirmed";
      message = `${orderText} has been confirmed.`;
      break;
    case "ORDER_SHIPPED":
      kind = "order";
      title = "Order shipped";
      message = `${orderText} is on its way.`;
      break;
    case "ORDER_DELIVERED":
      kind = "order";
      title = "Order delivered";
      message = `${orderText} has been delivered.`;
      break;
    case "ORDER_STATUS_UPDATE": {
      const status = typeof payload.status === "string" ? orderStatusLabel(payload.status) : "";
      kind = "order";
      title = "Order update";
      message = status ? `${orderText}: ${status}.` : `${orderText} has been updated.`;
      break;
    }
    case "PAYMENT_SUCCESS":
      kind = "payment";
      title = "Payment received";
      message =
        typeof payload.amount === "number"
          ? `We received ${formatPrice(payload.amount)} for ${orderText.toLowerCase()}.`
          : `We received your payment for ${orderText.toLowerCase()}.`;
      break;
    case "PAYMENT_FAILED":
      kind = "payment";
      title = "Payment not completed";
      message =
        typeof payload.reason === "string" && payload.reason
          ? payload.reason
          : `The payment for ${orderText.toLowerCase()} did not go through.`;
      break;
    default:
      return null;
  }

  sequence += 1;
  return {
    id: `${msg.event}-${Date.now()}-${sequence}`,
    kind,
    title,
    message,
    orderId,
    time: new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
    read: false,
  };
}

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  open: "Connected. New updates will appear here.",
  error: "We couldn't connect. Reload the page to try again.",
  closed: "Disconnected. Reload the page to reconnect.",
};

export default function NotificationsPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null until checked in the browser
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const signedIn = isLoggedIn();
    setLoggedIn(signedIn);
    if (!signedIn) return undefined;

    return connectNotifications((msg) => {
      const next = toNotification(msg);
      if (next) setItems((prev) => [next, ...prev]);
    }, setStatus);
  }, []);

  const visible = filter === "all" ? items : items.filter((n) => n.kind === filter);
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <>
      <div className="border-b border-line bg-offwhite">
        <div className="site-container flex flex-col gap-2.5 py-6 md:py-7">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate">
              <li>
                <Link href="/account" className="inline-flex min-h-[32px] items-center hover:text-navy">
                  My Account
                </Link>
              </li>
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true">/</span>
                <span aria-current="page">Notifications</span>
              </li>
            </ol>
          </nav>
          <h1 className="heading-display text-[28px] md:text-[40px]">Notifications</h1>
          <p className="max-w-[640px] text-slate">
            Order and payment updates show here as they happen, while this page is open. For earlier activity, see{" "}
            <Link href="/account" className="font-semibold text-navy underline">
              My Orders
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="site-container flex max-w-[860px] flex-col gap-5 pb-14 pt-6 md:pb-[72px] md:pt-9">
        {loggedIn === null ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : loggedIn === false ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-slate">Please log in to see updates about your orders.</p>
            <Link href="/login?next=/notifications" className="btn btn-gold">
              Log in
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="flex items-center gap-2 text-sm text-slate">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    status === "open" ? "bg-success" : status === "connecting" ? "bg-gold" : "bg-danger"
                  }`}
                />
                {STATUS_TEXT[status]}
                {unread > 0 && <span className="font-semibold text-navy">{unread} unread.</span>}
              </p>
              {items.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={markAllRead} disabled={unread === 0} className="btn btn-outline min-h-[40px] px-3">
                    Mark all read
                  </button>
                  <button type="button" onClick={() => setItems([])} className="btn btn-outline min-h-[40px] px-3">
                    Clear
                  </button>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div role="group" aria-label="Filter notifications" className="flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                  const count = f.id === "all" ? items.length : items.filter((n) => n.kind === f.id).length;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] font-medium ${
                        filter === f.id ? "border-navy bg-navy text-white" : "border-field bg-white text-navy hover:border-navy"
                      }`}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-md border border-line bg-offwhite px-6 py-12 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-mist text-slate">
                  <Icon name="bell" size={26} />
                </span>
                <p className="font-serif text-xl font-semibold">
                  {items.length === 0 ? "No new updates" : "Nothing in this group"}
                </p>
                {items.length === 0 && (
                  <p className="max-w-[420px] text-sm text-slate">
                    When an order is confirmed, shipped or delivered, or a payment goes through, it will appear here.
                  </p>
                )}
              </div>
            ) : (
              <ul className="flex flex-col gap-3" aria-live="polite">
                {visible.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3.5 rounded-md border p-4 md:p-5 ${
                      n.read ? "border-line bg-white" : "border-gold bg-offwhite"
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
                      <Icon name={n.kind === "payment" ? "card" : "box"} size={20} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-[15px] font-semibold">
                          {n.title}
                          {!n.read && <span className="sr-only"> (unread)</span>}
                        </p>
                        <span className="text-[13px] text-slate">{n.time}</span>
                      </div>
                      <p className="text-sm text-slate">{n.message}</p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-[13px] font-semibold">
                        {n.orderId && (
                          <Link
                            href={`/delivery?orderId=${encodeURIComponent(n.orderId)}`}
                            onClick={() => markRead(n.id)}
                            className="inline-flex min-h-[36px] items-center underline"
                          >
                            View order
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markRead(n.id)}
                            className="min-h-[36px] text-slate underline hover:text-navy"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}