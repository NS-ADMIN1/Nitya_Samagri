// apps/admin/lib/format.ts — how money, dates and counts are written across the admin.

/** ₹1,240 (Indian digit grouping; paise shown only when present). */
export function formatINR(amount: number | undefined | null): string {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;
}

/** Large amounts for headline numbers: ₹4.82L, ₹1.20Cr; small ones stay exact. */
export function formatINRShort(amount: number | undefined | null): string {
  const n = Number(amount) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return formatINR(Math.round(n));
}

export function formatCount(n: number | undefined | null): string {
  return (Number(n) || 0).toLocaleString("en-IN");
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "9:42 am" for today, "Yesterday", otherwise "8 Nov" (adds the year when it is not this year). */
export function formatWhen(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  if (sameDay(d, now)) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** "10 Nov, 9:42 am" — for timelines, where both the day and the time matter. */
export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
