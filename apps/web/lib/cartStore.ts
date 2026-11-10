// apps/web/lib/cartStore.ts
//
// A single shared cart, persisted to localStorage, used by every page that
// adds or reads cart items (home, product detail, cart/checkout). Before
// this, each page kept its own `useState([])` cart, so items added on the
// homepage never showed up on /cart.
//
// Items carry the real backend productId/variantId (Mongo ObjectId
// strings) alongside display fields, because checkout needs to send
// `{ productId, variantId, qty }` to POST /api/v1/orders.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  variantLabel?: string;
  price: number;
  mrp: number;
  qty: number;
  icon?: string;   // legacy: set by carts saved before the redesign, no longer read
  image?: string;  // product photo URL, when the product has one
  category?: string;
  gstPct?: number;
};

function cartKey(productId: string, variantId?: string) {
  return `${productId}:${variantId || ""}`;
}

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setQty: (productId: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, qty = 1) =>
        set((state) => {
          const key = cartKey(item.productId, item.variantId);
          const existing = state.items.find((i) => cartKey(i.productId, i.variantId) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                cartKey(i.productId, i.variantId) === key ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        }),
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => cartKey(i.productId, i.variantId) !== cartKey(productId, variantId)),
        })),
      setQty: (productId, variantId, qty) =>
        set((state) => ({
          items: qty <= 0
            ? state.items.filter((i) => cartKey(i.productId, i.variantId) !== cartKey(productId, variantId))
            : state.items.map((i) =>
                cartKey(i.productId, i.variantId) === cartKey(productId, variantId) ? { ...i, qty } : i
              ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "ns_cart" }
  )
);