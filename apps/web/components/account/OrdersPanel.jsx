"use client";

// components/account/OrdersPanel.jsx — the customer's orders, with a
// simple status filter.

import { useState } from "react";
import Link from "next/link";
import { useAccountStore } from "../../lib/accountStore";
import { orderStatusGroup } from "../../lib/orders";
import OrderCard from "./OrderCard";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "In progress" },
  { id: "delivered", label: "Delivered" },
  { id: "closed", label: "Cancelled or returned" },
];

export default function OrdersPanel() {
  const orders = useAccountStore((s) => s.orders);
  const totalOrders = useAccountStore((s) => s.totalOrders);
  const [filter, setFilter] = useState("all");

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h2 className="heading-display text-2xl">My Orders</h2>
        <p className="text-slate">You have not placed an order yet.</p>
        <Link href="/shop" className="btn btn-gold">
          Shop all products
        </Link>
      </div>
    );
  }

  const shown = filter === "all" ? orders : orders.filter((o) => orderStatusGroup(o.status) === filter);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="heading-display text-2xl">My Orders</h2>

      <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] font-medium ${
              filter === f.id ? "border-navy bg-navy text-white" : "border-field bg-white text-navy hover:border-navy"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-slate">No orders in this group.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((o) => (
            <OrderCard key={o.orderId} order={o} />
          ))}
        </ul>
      )}

      {totalOrders > orders.length && (
        <p className="text-[13px] text-slate">
          Showing your {orders.length} most recent orders of {totalOrders}.
        </p>
      )}
    </div>
  );
}
