// components/shop/FilterSidebar.jsx
//
// Filter controls for listing pages. Every option comes from the store's
// own data: categories from GET /categories, brands and pack sizes from
// GET /products/filters. `filters` / `onChange(partial)` are owned by
// ProductListing. Pass showCategories={false} on a category page.

const PRICE_RANGES = [
  { label: "Under ₹250", min: "", max: "250" },
  { label: "₹250 – ₹500", min: "250", max: "500" },
  { label: "₹500 – ₹1,000", min: "500", max: "1000" },
  { label: "Over ₹1,000", min: "1000", max: "" },
];

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Group({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-1 border-t border-line py-4">
      <legend className="float-left mb-2 w-full text-[13px] font-semibold uppercase tracking-[0.1em]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Choice({ type = "checkbox", name, checked, onChange, label, count }) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center gap-2.5 text-sm">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-[18px] w-[18px] shrink-0 accent-navy"
      />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-slate">{count}</span>}
    </label>
  );
}

export default function FilterSidebar({ filters, onChange, onClear, categories, facets, showCategories = true, hasActive }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3.5">
        <h2 className="text-base font-semibold">Filters</h2>
        {hasActive && (
          <button type="button" onClick={onClear} className="min-h-[32px] text-[13px] text-slate underline hover:text-navy">
            Clear all
          </button>
        )}
      </div>

      {showCategories && categories.length > 0 && (
        <Group title="Category">
          <Choice
            type="radio"
            name="category"
            checked={filters.categoryId === ""}
            onChange={() => onChange({ categoryId: "" })}
            label="All categories"
          />
          {categories.map((c) => (
            <Choice
              key={c._id}
              type="radio"
              name="category"
              checked={filters.categoryId === c._id}
              onChange={() => onChange({ categoryId: c._id })}
              label={c.name}
              count={c.productCount}
            />
          ))}
        </Group>
      )}

      <Group title="Price">
        {PRICE_RANGES.map((r) => (
          <Choice
            key={r.label}
            type="radio"
            name="price"
            checked={filters.minPrice === r.min && filters.maxPrice === r.max}
            onChange={() => onChange({ minPrice: r.min, maxPrice: r.max })}
            label={r.label}
          />
        ))}
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            aria-label="Minimum price in rupees"
            placeholder="₹ Min"
            value={filters.minPrice}
            onChange={(e) => onChange({ minPrice: e.target.value })}
            className="input min-h-[44px] min-w-0"
          />
          <span className="text-slate">to</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            aria-label="Maximum price in rupees"
            placeholder="₹ Max"
            value={filters.maxPrice}
            onChange={(e) => onChange({ maxPrice: e.target.value })}
            className="input min-h-[44px] min-w-0"
          />
        </div>
      </Group>

      {facets.sizes.length > 0 && (
        <Group title="Pack size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((sz) => {
              const on = filters.sizes.includes(sz.label);
              return (
                <button
                  key={sz.label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ sizes: toggle(filters.sizes, sz.label) })}
                  className={`inline-flex min-h-[40px] items-center rounded border px-3 text-[13px] font-medium ${
                    on ? "border-navy bg-navy text-white" : "border-field bg-white text-navy hover:border-navy"
                  }`}
                >
                  {sz.label}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {facets.brands.length > 0 && (
        <Group title="Brand">
          {facets.brands.map((b) => (
            <Choice
              key={b._id}
              checked={filters.brandIds.includes(b._id)}
              onChange={() => onChange({ brandIds: toggle(filters.brandIds, b._id) })}
              label={b.name}
              count={b.count}
            />
          ))}
        </Group>
      )}

      <Group title="Availability and offers">
        <Choice
          checked={filters.inStock}
          onChange={(e) => onChange({ inStock: e.target.checked })}
          label="In stock only"
        />
        <Choice
          checked={filters.onSale}
          onChange={(e) => onChange({ onSale: e.target.checked })}
          label="Discounted items"
        />
      </Group>
    </div>
  );
}
