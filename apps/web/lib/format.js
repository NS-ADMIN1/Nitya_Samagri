// apps/web/lib/format.js — display formatting shared by every page.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

// 1299 → "₹1,299"
export function formatPrice(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return `₹${inr.format(n)}`;
}

// Whole-number discount between MRP and selling price; 0 when there is none.
export function discountPercent(mrp, price) {
  const m = Number(mrp);
  const p = Number(price);
  if (!(m > 0) || !(p >= 0) || p >= m) return 0;
  return Math.round(((m - p) / m) * 100);
}

// "12 Nov 2026"; empty string when the date is missing/bad.
export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// "Nov 2026" for festival cards; empty string when the date is missing/bad.
export function formatMonthYear(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}