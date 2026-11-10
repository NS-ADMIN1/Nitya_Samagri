// components/product/ProductGrid.jsx — responsive grid of ProductCards.
// Two columns on phones, up to four on desktop. Pass columns={3} where the
// grid shares the row with a filter sidebar.

import ProductCard from "./ProductCard";

const GRID = {
  3: "grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3",
  4: "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4",
};

export function ProductGridSkeleton({ count = 4, columns = 4 }) {
  return (
    <div aria-hidden="true" className={GRID[columns] || GRID[4]}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="aspect-[4/3] bg-mist" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-3 w-1/3 rounded bg-mist" />
            <div className="h-4 w-4/5 rounded bg-mist" />
            <div className="h-5 w-1/4 rounded bg-mist" />
            <div className="h-11 rounded bg-mist" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductGrid({ products, columns = 4 }) {
  return (
    <ul className={GRID[columns] || GRID[4]}>
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}
