// apps/admin/lib/products.ts
//
// Catalogue data for the admin: the shapes the API returns, the product
// form's fields and checks, and the calls to
//   GET    /products/admin/all      list + counts
//   POST   /products                create
//   PATCH  /products/:id            edit / show / hide / restore
//   DELETE /products/:id            archive (super admin only)
//   GET/POST /categories, /brands   pickers

import useSWR, { mutate } from "swr";
import { api } from "./api";
import type { Pagination } from "./orders";

export interface NamedRef {
  _id: string;
  name: string;
}

export type ProductStatus = "draft" | "active" | "archived";

export interface Product {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDesc?: string;
  categoryId?: NamedRef | string | null;
  brandId?: NamedRef | string | null;
  mrp: number;
  price: number;
  costPrice?: number;
  gstPct?: number;
  hsnCode?: string;
  sku: string;
  stock: number;
  lowStockAt: number;
  weight?: number;
  tags?: string[];
  isFeatured?: boolean;
  status: ProductStatus;
}

export interface ProductStats {
  total: number;
  byStatus: Record<string, number>;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ProductsPage {
  products: Product[];
  pagination: Pagination;
  stats: ProductStats;
}

const PRODUCTS_PREFIX = "/api/v1/products";

export const productsFetcher = (url: string) => api.get<{ data: ProductsPage }>(url).then((r) => r.data);

export function productsUrl(params: {
  status?: string;
  stockFilter?: string;
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("status", params.status || "all");
  if (params.stockFilter) qs.set("stockFilter", params.stockFilter);
  if (params.q) qs.set("q", params.q);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  qs.set("page", String(params.page || 1));
  qs.set("limit", String(params.limit || 20));
  return `${PRODUCTS_PREFIX}/admin/all?${qs.toString()}`;
}

/** Refreshes every product list and stock count on screen. */
export function refreshProducts() {
  return mutate((key) => typeof key === "string" && key.startsWith(PRODUCTS_PREFIX));
}

export function refName(ref: NamedRef | string | null | undefined): string {
  return ref && typeof ref === "object" ? ref.name : "";
}
function refId(ref: NamedRef | string | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "object" ? ref._id : ref;
}

// ── Categories and brands (the two pickers on the product form) ───────────
const listFetcher = (url: string) => api.get<{ data: { items: NamedRef[] } }>(url).then((r) => r.data.items);

export function useCategories() {
  return useSWR("/api/v1/categories", listFetcher, { shouldRetryOnError: false });
}
export function useBrands() {
  return useSWR("/api/v1/brands", listFetcher, { shouldRetryOnError: false });
}

export async function createCategory(name: string): Promise<NamedRef> {
  const res = await api.post<{ data: { category: NamedRef } }>("/api/v1/categories", { name });
  await mutate("/api/v1/categories");
  return res.data.category;
}
export async function createBrand(name: string): Promise<NamedRef> {
  const res = await api.post<{ data: { brand: NamedRef } }>("/api/v1/brands", { name });
  await mutate("/api/v1/brands");
  return res.data.brand;
}

// ── The product form ───────────────────────────────────────────────────────
// Every field is kept as text while typing and converted when saving.
export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  brandId: string;
  shortDesc: string;
  description: string;
  tags: string;
  price: string;
  mrp: string;
  costPrice: string;
  gstPct: string;
  hsnCode: string;
  sku: string;
  stock: string;
  lowStockAt: string;
  weight: string;
  isFeatured: boolean;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  brandId: "",
  shortDesc: "",
  description: "",
  tags: "",
  price: "",
  mrp: "",
  costPrice: "",
  gstPct: "5",
  hsnCode: "",
  sku: "",
  stock: "0",
  lowStockAt: "10",
  weight: "",
  isFeatured: false,
};

const text = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(n));

export function toFormValues(p: Product): ProductFormValues {
  return {
    name: p.name || "",
    slug: p.slug || "",
    categoryId: refId(p.categoryId),
    brandId: refId(p.brandId),
    shortDesc: p.shortDesc || "",
    description: p.description || "",
    tags: (p.tags || []).join(", "),
    price: text(p.price),
    mrp: text(p.mrp),
    costPrice: text(p.costPrice),
    gstPct: text(p.gstPct ?? 5),
    hsnCode: p.hsnCode || "",
    sku: p.sku || "",
    stock: text(p.stock),
    lowStockAt: text(p.lowStockAt),
    weight: text(p.weight),
    isFeatured: !!p.isFeatured,
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type ProductErrors = Partial<Record<keyof ProductFormValues, string>>;

/** Same rules as the API (ProductCreateSchema), worded for staff. Empty object = ready to save. */
export function validateProduct(v: ProductFormValues): ProductErrors {
  const errors: ProductErrors = {};
  const price = Number(v.price);
  const mrp = Number(v.mrp);
  const gst = Number(v.gstPct);

  if (v.name.trim().length < 2) errors.name = "Enter the product name";
  if (!v.categoryId) errors.categoryId = "Choose a category";
  if (v.slug && !/^[a-z0-9-]+$/.test(v.slug)) errors.slug = "Use small letters, numbers and dashes only";
  if (v.shortDesc.length > 300) errors.shortDesc = "Keep this under 300 characters";
  if (!(price > 0)) errors.price = "Enter the selling price";
  if (!(mrp > 0)) errors.mrp = "Enter the MRP";
  else if (price > mrp) errors.price = "Selling price cannot be more than the MRP";
  if (v.costPrice && !(Number(v.costPrice) > 0)) errors.costPrice = "Enter an amount above 0, or leave it empty";
  if (v.gstPct === "" || Number.isNaN(gst) || gst < 0 || gst > 28) errors.gstPct = "GST must be between 0 and 28";
  if (v.sku.trim().length < 3) errors.sku = "Enter an SKU of at least 3 characters";
  if (!Number.isInteger(Number(v.stock)) || Number(v.stock) < 0) errors.stock = "Enter a whole number, 0 or more";
  if (!Number.isInteger(Number(v.lowStockAt)) || Number(v.lowStockAt) < 0) errors.lowStockAt = "Enter a whole number, 0 or more";
  if (v.weight && !(Number(v.weight) > 0)) errors.weight = "Enter a weight above 0, or leave it empty";
  return errors;
}

function toPayload(v: ProductFormValues, status: ProductStatus, includeStock: boolean) {
  return {
    name: v.name.trim(),
    slug: v.slug || undefined,
    description: v.description.trim() || undefined,
    shortDesc: v.shortDesc.trim() || undefined,
    categoryId: v.categoryId,
    brandId: v.brandId || undefined,
    mrp: Number(v.mrp),
    price: Number(v.price),
    costPrice: v.costPrice ? Number(v.costPrice) : undefined,
    gstPct: Number(v.gstPct),
    hsnCode: v.hsnCode.trim() || undefined,
    sku: v.sku.trim(),
    // On edit, stock is left alone: changes go through Inventory so each one is logged.
    ...(includeStock ? { stock: Number(v.stock) } : {}),
    lowStockAt: Number(v.lowStockAt),
    weight: v.weight ? Number(v.weight) : undefined,
    tags: v.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    isFeatured: v.isFeatured,
    status,
  };
}

export async function createProduct(values: ProductFormValues, status: ProductStatus): Promise<void> {
  await api.post(PRODUCTS_PREFIX, toPayload(values, status, true));
  await refreshProducts();
}

export async function updateProduct(id: string, values: ProductFormValues, status: ProductStatus): Promise<void> {
  await api.patch(`${PRODUCTS_PREFIX}/${id}`, toPayload(values, status, false));
  await refreshProducts();
}

/** Show on store (active), hide (draft) or restore an archived product (active). */
export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  await api.patch(`${PRODUCTS_PREFIX}/${id}`, { status });
  await refreshProducts();
}

/** Archive — the API allows this for super admins only. */
export async function archiveProduct(id: string): Promise<void> {
  await api.delete(`${PRODUCTS_PREFIX}/${id}`);
  await refreshProducts();
}
