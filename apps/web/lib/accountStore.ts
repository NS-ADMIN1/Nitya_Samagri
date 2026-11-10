// apps/web/lib/accountStore.ts
//
// Data for the /account page: the signed-in customer (GET /auth/me), their
// orders (GET /orders) and cancelling an order (POST /orders/:id/cancel).
// Only fields the backend really returns are kept — there is no wishlist,
// loyalty or editable-profile data because the backend has none.

import { create } from "zustand";
import { apiFetch } from "./auth";

export type AccountUser = {
  name: string;
  email: string;
  phone: string;
  joined: string; // "March 2026"
};

export type AccountOrderItem = { name: string; qty: number; price: number };

export type AccountOrder = {
  orderId: string;
  status: string; // backend status: pending, confirmed, shipped, delivered, cancelled, …
  paymentMethod: string;
  paymentStatus: string;
  date: string; // "10 Nov 2026"
  subtotal: number;
  gst: number;
  shipping: number;
  discount: number;
  total: number;
  items: AccountOrderItem[];
  address: { name?: string; line1?: string; line2?: string; city?: string; state?: string; pin?: string } | null;
};

const EMPTY_USER: AccountUser = { name: "", email: "", phone: "", joined: "" };

// The list endpoint returns at most 50 orders per page.
const ORDERS_PAGE_SIZE = 50;

function formatDate(value: unknown, options: Intl.DateTimeFormatOptions): string {
  if (!value) return "";
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", options);
}

function normalizeOrder(o: any): AccountOrder {
  return {
    orderId: o.orderId,
    status: o.status || "pending",
    paymentMethod: o.paymentMethod || "",
    paymentStatus: o.paymentStatus || "pending",
    date: formatDate(o.createdAt, { day: "numeric", month: "short", year: "numeric" }),
    subtotal: o.subtotal ?? 0,
    gst: o.gst ?? 0,
    shipping: o.shipping ?? 0,
    discount: o.discount ?? 0,
    total: o.total ?? 0,
    items: (o.items || []).map((it: any) => ({ name: it.productName, qty: it.qty, price: it.price })),
    address: o.address || null,
  };
}

type AccountState = {
  user: AccountUser;
  orders: AccountOrder[];
  totalOrders: number; // across all pages, from the API's pagination
  loading: boolean;
  error: string;
  load: () => Promise<void>;
  cancelOrder: (orderId: string) => Promise<{ ok: boolean; message: string }>;
};

export const useAccountStore = create<AccountState>((set) => ({
  user: EMPTY_USER,
  orders: [],
  totalOrders: 0,
  loading: true,
  error: "",

  load: async () => {
    set({ loading: true, error: "" });
    try {
      const [meRes, ordersRes] = await Promise.all([
        apiFetch<{ data: { user: any } }>("/auth/me"),
        apiFetch<{ data: { orders: any[]; pagination?: { total?: number } } }>(`/orders?limit=${ORDERS_PAGE_SIZE}`),
      ]);

      if (!meRes.ok) throw new Error(meRes.body.message || "Couldn't load your account.");
      const u = meRes.body.data.user;
      set({
        user: {
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          joined: formatDate(u.createdAt, { month: "long", year: "numeric" }),
        },
      });

      if (ordersRes.ok) {
        const orders = (ordersRes.body.data.orders || []).map(normalizeOrder);
        set({ orders, totalOrders: ordersRes.body.data.pagination?.total ?? orders.length });
      } else {
        set({ error: ordersRes.body.message || "Couldn't load your orders." });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      set({ loading: false });
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const res = await apiFetch(`/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelled by customer" }),
      });
      if (!res.ok) return { ok: false, message: res.body.message || "This order could not be cancelled." };
      set((state) => ({
        orders: state.orders.map((o) => (o.orderId === orderId ? { ...o, status: "cancelled" } : o)),
      }));
      return { ok: true, message: "" };
    } catch {
      return { ok: false, message: "Couldn't reach the server. Please try again." };
    }
  },
}));