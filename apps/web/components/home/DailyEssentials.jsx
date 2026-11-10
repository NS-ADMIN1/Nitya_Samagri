// components/home/DailyEssentials.jsx
// The most prominent section on the homepage: off-white band, gold top
// rule, larger heading.

import Link from "next/link";
import ProductGrid, { ProductGridSkeleton } from "../product/ProductGrid";

export default function DailyEssentials({ products, loading, error, href = "/shop" }) {
  // Nothing to sell yet and nothing wrong → leave the section out entirely.
  if (!loading && !error && products.length === 0) return null;

  return (
    <section aria-labelledby="home-essentials" className="border-t-[3px] border-gold bg-offwhite">
      <div className="site-container flex flex-col gap-7 py-12 md:gap-8 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex max-w-[640px] flex-col gap-2.5">
            <p className="eyebrow">Daily Pooja Essentials</p>
            <h2 id="home-essentials" className="heading-display text-[28px] md:text-[44px]">
              Your Everyday Pooja Essentials
            </h2>
            <p className="text-[15px] text-slate md:text-[17px]">
              Everything your home mandir needs for morning and evening prayers.
            </p>
          </div>
          <Link href={href} className="btn btn-navy">
            View all essentials
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <p role="alert" className="rounded-md border border-line bg-white p-6 text-center text-sm text-danger">
            {error}
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </section>
  );
}
