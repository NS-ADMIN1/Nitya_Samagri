// components/product/PackSizePicker.jsx
// One button per pack size (product variant). Sold-out sizes stay visible
// but cannot be picked.

export default function PackSizePicker({ variants, selectedId, onSelect }) {
  if (!variants || variants.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.1em]">Pack size</legend>
      <div className="flex flex-wrap gap-2.5">
        {variants.map((v) => {
          const selected = v.id === selectedId;
          const soldOut = !(v.stock > 0);
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              disabled={soldOut}
              onClick={() => onSelect(v)}
              className={`inline-flex min-h-[44px] flex-col items-center justify-center rounded px-4 text-sm ${
                selected ? "border-2 border-navy font-semibold" : "border border-field font-medium hover:border-navy"
              } ${soldOut ? "bg-mist text-slate line-through" : "bg-white text-navy"}`}
            >
              {v.label}
              {soldOut && <span className="sr-only"> (out of stock)</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
