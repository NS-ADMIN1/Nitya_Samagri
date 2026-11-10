"use client";

// apps/web/app/account/page.jsx — the signed-in customer's account.
//
// Sections: Overview, My Orders, Addresses, Profile. All data is real:
// profile and orders from lib/accountStore.ts, addresses from /addresses.
// The old wishlist, rewards and "edit profile" sections were sample data
// with no backend behind them and are not shown.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccountStore } from "../../lib/accountStore";
import { apiFetch, clearSession, isLoggedIn } from "../../lib/auth";
import { formatPrice } from "../../lib/format";
import { BRAND } from "../../lib/theme";
import AddressesPanel from "../../components/account/AddressesPanel";
import OrderCard from "../../components/account/OrderCard";
import OrdersPanel from "../../components/account/OrdersPanel";
import Icon from "../../components/ui/Icon";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "orders", label: "My Orders", icon: "box" },
  { id: "addresses", label: "Addresses", icon: "pin" },
  { id: "profile", label: "Profile", icon: "user" },
];

const RECENT_ORDERS = 3;

function Overview({ onViewOrders }) {
  const orders = useAccountStore((s) => s.orders);
  const totalOrders = useAccountStore((s) => s.totalOrders);

  // Only exact when every order is loaded; otherwise the figure is left out.
  const allLoaded = totalOrders <= orders.length;
  const totalSpent = orders.reduce(
    (sum, o) => sum + (o.paymentStatus === "paid" || o.status === "delivered" ? o.total : 0),
    0
  );

  return (
    <div className="flex flex-col gap-7">
      <dl className="grid grid-cols-2 gap-3 md:gap-5">
        <div className="rounded-md border border-line bg-offwhite p-4 md:p-5">
          <dt className="text-[13px] text-slate">Orders placed</dt>
          <dd className="text-2xl font-bold md:text-3xl">{totalOrders}</dd>
        </div>
        {allLoaded && (
          <div className="rounded-md border border-line bg-offwhite p-4 md:p-5">
            <dt className="text-[13px] text-slate">Total spent</dt>
            <dd className="text-2xl font-bold md:text-3xl">{formatPrice(totalSpent)}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="heading-display text-2xl">Recent Orders</h2>
          {orders.length > 0 && (
            <button type="button" onClick={onViewOrders} className="inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold">
              View all
              <Icon name="chevronRight" size={16} />
            </button>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-slate">You have not placed an order yet.</p>
            <Link href="/shop" className="btn btn-gold">
              Shop all products
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.slice(0, RECENT_ORDERS).map((o) => (
              <OrderCard key={o.orderId} order={o} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Profile() {
  const user = useAccountStore((s) => s.user);
  const rows = [
    ["Name", user.name],
    ["Mobile number", user.phone],
    ["Email", user.email],
    ["Customer since", user.joined],
  ].filter(([, value]) => value);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="heading-display text-2xl">Profile</h2>
      <dl className="flex max-w-[520px] flex-col rounded-md border border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 text-sm last:border-b-0">
            <dt className="text-slate">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-[520px] text-sm text-slate">
        To change your name, mobile number or email, write to{" "}
        <a href={`mailto:${BRAND.email}`} className="font-semibold text-navy underline">
          {BRAND.email}
        </a>
        .
      </p>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const user = useAccountStore((s) => s.user);
  const loading = useAccountStore((s) => s.loading);
  const error = useAccountStore((s) => s.error);
  const load = useAccountStore((s) => s.load);

  const [section, setSection] = useState("overview");
  const [ready, setReady] = useState(false); // true once we know the visitor is signed in
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login?next=/account");
      return;
    }
    setReady(true);
    load();
  }, [router, load]);

  const signOut = async () => {
    setSigningOut(true);
    // Ends the session on the server too; the local session is cleared
    // even if that call fails.
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
    router.push("/");
  };

  if (!ready) {
    return <div className="site-container py-16 text-center text-sm text-slate">Loading your account…</div>;
  }

  return (
    <>
      <div className="bg-navy text-white">
        <div className="site-container flex flex-wrap items-end justify-between gap-4 py-7 md:py-9">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">My Account</p>
            <h1 className="font-serif text-[28px] font-semibold leading-tight md:text-[38px]">
              {user.name && user.name !== "New User" ? `Namaste, ${user.name}` : "Namaste"}
            </h1>
            {user.joined && <p className="text-sm text-slate-light">Customer since {user.joined}</p>}
          </div>
          <button type="button" onClick={signOut} disabled={signingOut} className="btn btn-outline-light min-h-[44px] px-4">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      <div className="site-container flex flex-col gap-6 pb-14 pt-6 md:flex-row md:items-start md:gap-10 md:pb-[72px] md:pt-9">
        <nav aria-label="Account sections" className="md:w-[230px] md:shrink-0">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
            {SECTIONS.map((s) => {
              const active = section === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(s.id)}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded px-3.5 text-sm ${
                      active ? "bg-navy font-semibold text-white" : "font-medium text-navy hover:bg-mist"
                    }`}
                  >
                    <Icon name={s.icon} size={18} />
                    {s.label}
                  </button>
                </li>
              );
            })}
            <li className="shrink-0 md:mt-3 md:border-t md:border-line md:pt-3">
              <Link href="/reviews" className="flex min-h-[44px] items-center gap-2.5 rounded px-3.5 text-sm font-medium hover:bg-mist">
                <Icon name="check" size={18} />
                My Reviews
              </Link>
            </li>
            <li className="shrink-0">
              <Link href="/notifications" className="flex min-h-[44px] items-center gap-2.5 rounded px-3.5 text-sm font-medium hover:bg-mist">
                <Icon name="mail" size={18} />
                Notifications
              </Link>
            </li>
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          {error && (
            <p role="alert" className="mb-5 rounded border border-danger p-4 text-sm font-semibold text-danger">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : section === "overview" ? (
            <Overview onViewOrders={() => setSection("orders")} />
          ) : section === "orders" ? (
            <OrdersPanel />
          ) : section === "addresses" ? (
            <AddressesPanel />
          ) : (
            <Profile />
          )}
        </div>
      </div>
    </>
  );
}