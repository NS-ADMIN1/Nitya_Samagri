// components/shop/ActiveFilters.jsx
// Result count plus a removable chip for each filter in effect.
// `chips` is [{ key, label, clear }] built by ProductListing.

import Icon from "../ui/Icon";

export default function ActiveFilters({ total, loading, chips, onClear }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-1 text-sm text-slate" aria-live="polite">
        {loading ? "Loading…" : `${total} product${total === 1 ? "" : "s"}`}
      </p>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          aria-label={`Remove filter: ${c.label}`}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-mist px-3 text-[13px] font-medium hover:bg-line"
        >
          {c.label}
          <Icon name="close" size={14} />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" onClick={onClear} className="min-h-[36px] px-1 text-[13px] text-slate underline hover:text-navy">
          Clear all
        </button>
      )}
    </div>
  );
}
