// components/home/BestSellers.jsx
// Ranked by real units sold (Product.sold). The section only appears once
// at least one product has actually been ordered.

import ProductGrid from "../product/ProductGrid";
import SectionHeader from "./SectionHeader";

export default function BestSellers({ products }) {
  if (!products || products.length === 0) return null;

  return (
    <section aria-labelledby="home-bestsellers" className="section">
      <div className="site-container flex flex-col gap-6 md:gap-7">
        <SectionHeader
          id="home-bestsellers"
          title="Best Sellers"
          subtitle="Most ordered by our customers."
          href="/shop"
        />
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
