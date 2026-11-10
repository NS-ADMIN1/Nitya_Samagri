// components/home/CategoryRow.jsx — "Shop by Category"
// Categories come from GET /categories; a category without an image shows
// the neutral placeholder. Scrolls sideways on phones, grid on desktop.

import Link from "next/link";
import PhotoPlaceholder from "../ui/PhotoPlaceholder";
import SectionHeader from "./SectionHeader";

export default function CategoryRow({ categories }) {
  if (!categories || categories.length === 0) return null;

  return (
    <section aria-labelledby="home-categories" className="section">
      <div className="site-container flex flex-col gap-6 md:gap-7">
        <SectionHeader id="home-categories" title="Shop by Category" href="/shop" linkLabel="View all products" />
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] md:gap-5 md:overflow-visible md:px-0 md:pb-0">
          {categories.map((c) => (
            <li key={c._id} className="w-[84px] shrink-0 md:w-auto">
              <Link
                href={`/category/${c.slug}`}
                className="group flex flex-col items-center gap-2.5 text-center text-[13px] font-medium leading-tight"
              >
                <span className="block aspect-square w-full overflow-hidden rounded-full border border-line transition-colors group-hover:border-gold">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <PhotoPlaceholder size={26} />
                  )}
                </span>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
