// apps/admin/lib/coupons.ts
//
// Coupons: the shape the API returns, the form's fields and checks, and
// the calls to GET/POST /coupons and PATCH/DELETE /coupons/:id
// (admin and super admin only).

import { mutate } from "swr";
import { api } from "./api";
import type { PillTone } from "../components/ui/StatusPill";
import { formatINR } from "./format";

export type CouponType = "percent" | "flat";

export interface Coupon {
  _id: string;
  code: string;
  desc?: string;
  type: CouponType;
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export const COUPONS_URL = "/api/v1/coupons?limit=100";
export const couponsFetcher = (url: string) => api.get<{ data: { coupons: Coupon[] } }>(url).then((r) => r.data.coupons);
const refresh = () => mutate(COUPONS_URL);

// ── Where a coupon stands right now ────────────────────────────────────────
export type CouponState = "active" | "scheduled" | "paused" | "expired" | "used_up";

export function couponState(c: Coupon, now = new Date()): CouponState {
  if (c.expiresAt && new Date(c.expiresAt) < now) return "expired";
  if (c.usageLimit && c.usedCount >= c.usageLimit) return "used_up";
  if (!c.isActive) return "paused";
  if (c.startsAt && new Date(c.startsAt) > now) return "scheduled";
  return "active";
}

export const COUPON_STATE: Record<CouponState, { label: string; tone: PillTone }> = {
  active: { label: "Active", tone: "green" },
  scheduled: { label: "Scheduled", tone: "blue" },
  paused: { label: "Paused", tone: "grey" },
  expired: { label: "Expired", tone: "grey" },
  used_up: { label: "Used up", tone: "orange" },
};

/** "10% off, up to ₹100" / "₹50 off". */
export function offerText(c: Pick<Coupon, "type" | "value" | "maxDiscount">): string {
  if (c.type === "flat") return `${formatINR(c.value)} off`;
  return `${c.value}% off${c.maxDiscount ? `, up to ${formatINR(c.maxDiscount)}` : ""}`;
}

/** What the customer saves on an order of `orderValue` rupees (0 when below the minimum order). */
export function discountFor(c: Pick<Coupon, "type" | "value" | "maxDiscount" | "minOrderValue">, orderValue: number): number {
  if (orderValue < (c.minOrderValue || 0)) return 0;
  if (c.type === "flat") return Math.min(c.value, orderValue);
  const off = Math.round((orderValue * c.value) / 100);
  return c.maxDiscount ? Math.min(off, c.maxDiscount) : off;
}

// ── The coupon form ────────────────────────────────────────────────────────
// Every field is kept as text while typing and converted when saving.
export interface CouponFormValues {
  code: string;
  desc: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  usageLimit: string;
  /** Dates as YYYY-MM-DD (what a date input gives), in the staff member's own time zone. */
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

export const EMPTY_COUPON: CouponFormValues = {
  code: "",
  desc: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minOrderValue: "",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const text = (n: number | undefined | null) => (n === undefined || n === null ? "" : String(n));

function toDateInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toCouponForm(c: Coupon): CouponFormValues {
  return {
    code: c.code,
    desc: c.desc || "",
    type: c.type,
    value: text(c.value),
    maxDiscount: text(c.maxDiscount),
    minOrderValue: c.minOrderValue ? text(c.minOrderValue) : "",
    usageLimit: text(c.usageLimit),
    startsAt: toDateInput(c.startsAt),
    expiresAt: toDateInput(c.expiresAt),
    isActive: c.isActive,
  };
}

export type CouponErrors = Partial<Record<keyof CouponFormValues, string>>;

/** Same rules as the API (CouponSchema), worded for staff. Empty object = ready to save. */
export function validateCoupon(v: CouponFormValues): CouponErrors {
  const errors: CouponErrors = {};
  const value = Number(v.value);
  const code = v.code.trim();

  if (code.length < 3 || code.length > 30) errors.code = "Use 3 to 30 characters";
  else if (!/^[A-Z0-9]+$/.test(code)) errors.code = "Use capital letters and numbers only";
  if (v.desc.length > 200) errors.desc = "Keep this under 200 characters";
  if (!(value > 0)) errors.value = v.type === "percent" ? "Enter the percent off" : "Enter the amount off";
  else if (v.type === "percent" && value > 100) errors.value = "Percent off cannot be more than 100";
  if (v.maxDiscount && !(Number(v.maxDiscount) > 0)) errors.maxDiscount = "Enter an amount above 0, or leave it empty";
  if (v.minOrderValue && !(Number(v.minOrderValue) >= 0)) errors.minOrderValue = "Enter 0 or more, or leave it empty";
  if (v.usageLimit && !(Number.isInteger(Number(v.usageLimit)) && Number(v.usageLimit) > 0)) errors.usageLimit = "Enter a whole number above 0, or leave it empty";
  if (v.startsAt && v.expiresAt && v.startsAt > v.expiresAt) errors.expiresAt = "The end date must be on or after the start date";
  return errors;
}

// A coupon is valid from the start of its first day to the end of its last day.
const startOfDay = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

function toPayload(v: CouponFormValues) {
  const num = (s: string) => (s === "" ? undefined : Number(s));
  return {
    code: v.code.trim().toUpperCase(),
    desc: v.desc.trim() || undefined,
    type: v.type,
    value: Number(v.value),
    maxDiscount: v.type === "percent" ? num(v.maxDiscount) : undefined,
    minOrderValue: num(v.minOrderValue) ?? 0,
    usageLimit: num(v.usageLimit),
    isActive: v.isActive,
    startsAt: v.startsAt ? startOfDay(v.startsAt) : undefined,
    expiresAt: v.expiresAt ? endOfDay(v.expiresAt) : undefined,
  };
}

export async function createCoupon(values: CouponFormValues): Promise<void> {
  await api.post("/api/v1/coupons", toPayload(values));
  await refresh();
}

export async function updateCoupon(id: string, values: CouponFormValues): Promise<void> {
  await api.patch(`/api/v1/coupons/${id}`, toPayload(values));
  await refresh();
}

/** Switch a coupon on or off without touching anything else. */
export async function setCouponActive(id: string, isActive: boolean): Promise<void> {
  await api.patch(`/api/v1/coupons/${id}`, { isActive });
  await refresh();
}

export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`/api/v1/coupons/${id}`);
  await refresh();
}

/** An 8-character code without look-alike characters (no O/0, I/1). */
export function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
