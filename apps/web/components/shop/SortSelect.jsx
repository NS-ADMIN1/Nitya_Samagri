// components/shop/SortSelect.jsx
// Sort options map straight onto GET /products `sortBy` / `sortOrder`.

export const SORTS = [
  { label: "Newest", sortBy: "createdAt", sortOrder: "desc" },
  { label: "Best selling", sortBy: "sold", sortOrder: "desc" },
  { label: "Price: low to high", sortBy: "price", sortOrder: "asc" },
  { label: "Price: high to low", sortBy: "price", sortOrder: "desc" },
  { label: "Name A–Z", sortBy: "name", sortOrder: "asc" },
];

export default function SortSelect({ value, onChange }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <span className="whitespace-nowrap">Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input min-h-[44px] w-auto pr-8"
      >
        {SORTS.map((s, i) => (
          <option key={s.label} value={i}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
