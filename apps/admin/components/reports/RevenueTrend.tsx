// apps/admin/components/reports/RevenueTrend.tsx
//
// Revenue from paid orders for the last six months, as simple columns.
// The current month is the solid navy column.

import { formatINRShort, plural } from "../../lib/format";
import type { OrderStats } from "../../lib/stats";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RevenueTrend({ trend }: { trend: OrderStats["revenueTrend"] }) {
  if (trend.length === 0) return <p className="text-sm text-slate">No paid orders in the last six months.</p>;
  const max = Math.max(1, ...trend.map((t) => t.revenue));
  return (
    <ul className="flex h-[220px] items-end gap-3" aria-label="Revenue by month">
      {trend.map((t, i) => {
        const current = i === trend.length - 1;
        const month = MONTHS[Number(t.month.split("-")[1]) - 1] || t.month;
        return (
          <li key={t.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className={`text-xs tabular-nums ${current ? "font-bold text-navy" : "text-slate"}`}>{formatINRShort(t.revenue)}</span>
            <div
              className={`w-full max-w-[72px] rounded-t-md ${current ? "bg-navy" : "bg-[#C9D2E6]"}`}
              style={{ height: `${Math.max(3, (t.revenue / max) * 150)}px` }}
            />
            <span className={`text-xs ${current ? "font-bold text-navy" : "text-slate"}`}>{month}</span>
            <span className="text-[11px] text-slate">{plural(t.orders, "order")}</span>
          </li>
        );
      })}
    </ul>
  );
}
