// apps/web/lib/catalog.js
//
// Read-only catalog lookups shared across the page (header, footer and
// homepage all need the category list — this fetches it once per page load
// instead of three times).

import { apiFetch } from "./auth";
import { normalizeProduct } from "./normalize";

let categoriesPromise = null;

// GET /categories → [{ _id, name, slug, imageUrl, productCount, ... }]
// Resolves to [] on any failure so callers can simply render nothing.
export function getCategories() {
  if (!categoriesPromise) {
    categoriesPromise = apiFetch("/categories")
      .then(({ ok, body }) => (ok ? body?.data?.items || [] : []))
      .catch(() => []);
    // Don't cache a failed/empty load forever — allow a retry on next call.
    categoriesPromise.then((items) => {
      if (items.length === 0) categoriesPromise = null;
    });
  }
  return categoriesPromise;
}

// GET /products with the given query params → normalized products.
// Resolves to { ok, products, pagination, message }.
const EMPTY_PAGINATION = { page: 1, pages: 1, total: 0 };

export async function getProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== false) query.set(key, String(value));
  });
  try {
    const { ok, body } = await apiFetch(`/products?${query.toString()}`);
    if (!ok) {
      return { ok: false, products: [], pagination: EMPTY_PAGINATION, message: body?.message || "Couldn't load products." };
    }
    return {
      ok: true,
      products: (body?.data?.products || []).map(normalizeProduct),
      pagination: body?.data?.pagination || EMPTY_PAGINATION,
      message: "",
    };
  } catch {
    return { ok: false, products: [], pagination: EMPTY_PAGINATION, message: "Couldn't reach the server. Please try again." };
  }
}

// GET /products/filters → brands, pack sizes and the price range that
// exist among active products. Resolves to empty facets on failure.
export async function getProductFacets() {
  const empty = { brands: [], sizes: [], price: { min: 0, max: 0 } };
  try {
    const { ok, body } = await apiFetch("/products/filters");
    if (!ok || !body?.data) return empty;
    return { ...empty, ...body.data };
  } catch {
    return empty;
  }
}

// First category whose name or slug matches the pattern (e.g. /daily/i).
export function findCategory(categories, pattern) {
  return categories.find((c) => pattern.test(c.slug || "") || pattern.test(c.name || "")) || null;
}