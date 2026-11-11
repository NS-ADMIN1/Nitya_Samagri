"use client";

// apps/admin/components/ui/Tabs.tsx
//
// Filter tabs with optional counts ("To pack 14"). Used above every list.

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Says what the tabs filter, for screen readers. */
  label: string;
}

export default function Tabs<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => {
        const on = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(item.id)}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 font-sans text-sm font-semibold transition-colors ${
              on ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:bg-mist"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-2 py-px text-xs font-semibold tabular-nums ${
                  on ? "bg-white/20 text-white" : "bg-mist text-slate"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
