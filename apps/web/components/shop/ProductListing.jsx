"use client";

// components/shop/ProductListing.jsx
//
// Filters + sort + product grid + pagination, shared by /shop and
// /category/[slug]. It owns the filter state and calls GET /products.
//
//   searchTerm       text search from the header (?q=), optional
//   onClearSearch    called when the search chip is removed
//   fixedCategoryId  lock the listing to one category (category page);
//                    the category filter is hidden
//   initialCategoryId  preselect a category on /shop (?category=<slug>)

import { useEffect, useState } from "react";
import { getCategories, getProductFacets, getProducts } from "../../lib/catalog";
import { formatPrice } from "../../lib/format";
import Icon from "../ui/Icon";
import Pagination from "../ui/Pagination";
import ProductGrid, { ProductGridSkeleton } from "../product/ProductGrid";
import ActiveFilters from "./ActiveFilters";
import FilterSidebar from "./FilterSidebar";
import SortSelect, { SORTS } from "./SortSelect";

const PAGE_SIZE = 12;

const EMPTY_FILTERS = {
  categoryId: "",
  brandIds: [],
  sizes: [],
  minPrice: "",
  maxPrice: "",
  inStock: false,
  onSale: false,
};

export default function ProductListing({ searchTerm = "", onClearSearch, fixedCategoryId = "", initialCategoryId = "" }) {
  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState({ brands: [], sizes: [], price: { min: 0, max: 0 } });

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, categoryId: initialCategoryId });
  const [sortIdx, setSortIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false); // phones only

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCategories().then((items) => !cancelled && setCategories(items));
    getProductFacets().then((f) => !cancelled && setFacets(f));
    return () => {
      cancelled = true;
    };
  }, []);

  // A new search or a different preselected category starts from page 1.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, fixedCategoryId]);

  useEffect(() => {
    setFilters((f) => ({ ...f, categoryId: initialCategoryId }));
    setPage(1);
  }, [initialCategoryId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    // Short delay so typing a price doesn't send a request per keystroke.
    const timer = setTimeout(async () => {
      const sort = SORTS[sortIdx];
      const res = await getProducts({
        page,
        limit: PAGE_SIZE,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
        q: searchTerm,
        categoryId: fixedCategoryId || filters.categoryId,
        brandId: filters.brandIds.join(","),
        size: filters.sizes.join(","),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStock: filters.inStock,
        onSale: filters.onSale,
      });
      if (cancelled) return;
      setProducts(res.products);
      setPagination(res.pagination);
      setError(res.ok ? "" : res.message);
      setLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, fixedCategoryId, filters, sortIdx, page]);

  const update = (partial) => {
    setFilters((f) => ({ ...f, ...partial }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    if (searchTerm) onClearSearch?.();
  };

  const changePage = (next) => {
    setPage(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // One removable chip per filter in effect.
  const chips = [];
  if (searchTerm) chips.push({ key: "q", label: `Search: ${searchTerm}`, clear: () => onClearSearch?.() });
  if (!fixedCategoryId && filters.categoryId) {
    chips.push({
      key: "cat",
      label: categories.find((c) => c._id === filters.categoryId)?.name || "Category",
      clear: () => update({ categoryId: "" }),
    });
  }
  filters.brandIds.forEach((id) =>
    chips.push({
      key: `b${id}`,
      label: facets.brands.find((b) => b._id === id)?.name || "Brand",
      clear: () => update({ brandIds: filters.brandIds.filter((x) => x !== id) }),
    })
  );
  filters.sizes.forEach((sz) =>
    chips.push({ key: `s${sz}`, label: sz, clear: () => update({ sizes: filters.sizes.filter((x) => x !== sz) }) })
  );
  if (filters.minPrice || filters.maxPrice) {
    chips.push({
      key: "price",
      label: `${formatPrice(filters.minPrice || 0)} – ${filters.maxPrice ? formatPrice(filters.maxPrice) : "any"}`,
      clear: () => update({ minPrice: "", maxPrice: "" }),
    });
  }
  if (filters.inStock) chips.push({ key: "stock", label: "In stock", clear: () => update({ inStock: false }) });
  if (filters.onSale) chips.push({ key: "sale", label: "Discounted", clear: () => update({ onSale: false }) });

  return (
    <div className="site-container flex flex-col gap-6 pb-14 pt-6 md:flex-row md:items-start md:gap-10 md:pb-[72px] md:pt-9">
      <aside
        id="listing-filters"
        aria-label="Filters"
        className={`${filtersOpen ? "block" : "hidden"} rounded-md border border-line p-4 md:sticky md:top-[150px] md:block md:max-h-[calc(100vh-170px)] md:w-[250px] md:shrink-0 md:overflow-y-auto md:rounded-none md:border-0 md:p-0`}
      >
        <FilterSidebar
          filters={filters}
          onChange={update}
          onClear={clearAll}
          categories={categories}
          facets={facets}
          showCategories={!fixedCategoryId}
          hasActive={chips.length > 0}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-outline min-h-[44px] px-4 md:hidden"
            aria-expanded={filtersOpen}
            aria-controls="listing-filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Icon name="filter" size={18} />
            {filtersOpen ? "Hide filters" : `Filters${chips.length ? ` (${chips.length})` : ""}`}
          </button>
          <div className="md:ml-auto">
            <SortSelect
              value={sortIdx}
              onChange={(i) => {
                setSortIdx(i);
                setPage(1);
              }}
            />
          </div>
        </div>

        <ActiveFilters total={pagination.total} loading={loading} chips={chips} onClear={clearAll} />

        {loading ? (
          <ProductGridSkeleton count={6} columns={3} />
        ) : error ? (
          <p role="alert" className="rounded-md border border-line bg-offwhite p-8 text-center text-sm text-danger">
            {error}
          </p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-line bg-offwhite px-6 py-12 text-center">
            <p className="font-serif text-xl font-semibold">No products found</p>
            <p className="max-w-[420px] text-sm text-slate">
              {chips.length > 0
                ? "Nothing matches these filters. Try removing one or two."
                : "Products will appear here as soon as they are added to the store."}
            </p>
            {chips.length > 0 && (
              <button type="button" className="btn btn-navy" onClick={clearAll}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <ProductGrid products={products} columns={3} />
            <Pagination page={pagination.page} pages={pagination.pages} onChange={changePage} />
          </>
        )}
      </div>
    </div>
  );
}
