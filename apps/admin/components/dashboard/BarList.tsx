// apps/admin/components/dashboard/BarList.tsx
//
// Labelled horizontal bars (order pipeline, category sales, payment split).
// Bars are scaled against the largest value in the list.

interface BarItem {
  label: string;
  value: number;
  /** Text shown at the end of the row; defaults to the value. */
  display?: string;
  /** Bar colour as a hex value. */
  color?: string;
}

interface BarListProps {
  items: BarItem[];
  emptyText?: string;
}

export default function BarList({ items, emptyText = "No data yet" }: BarListProps) {
  if (items.length === 0) return <p className="text-sm text-slate">{emptyText}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
          <span className="truncate text-slate">{item.label}</span>
          <div className="h-2.5 rounded-full bg-mist">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: item.color || "#071C42" }}
            />
          </div>
          <span className="min-w-[36px] text-right font-semibold tabular-nums text-navy">{item.display ?? item.value.toLocaleString("en-IN")}</span>
        </li>
      ))}
    </ul>
  );
}
