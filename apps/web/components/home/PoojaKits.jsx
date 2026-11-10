// components/home/PoojaKits.jsx — "Complete Pooja Kits"
// Shows products from the kits category. Hidden when there are none.

import Link from "next/link";
import { formatPrice } from "../../lib/format";
import PhotoPlaceholder from "../ui/PhotoPlaceholder";
import SectionHeader from "./SectionHeader";

export default function PoojaKits({ products, href = "/shop" }) {
  if (!products || products.length === 0) return null;

  return (
    <section aria-labelledby="home-kits" className="bg-mist">
      <div className="site-container section flex flex-col gap-6 md:gap-7">
        <SectionHeader
          id="home-kits"
          title="Complete Pooja Kits"
          subtitle="Everything for the pooja in one box."
          href={href}
          linkLabel="View all kits"
        />
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((kit) => (
            <li key={kit.id}>
              <article className="card h-full sm:flex-row">
                <div className="aspect-[4/3] shrink-0 overflow-hidden sm:aspect-auto sm:w-[42%]">
                  {kit.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={kit.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <PhotoPlaceholder icon="box" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-4 md:p-5">
                  <h3 className="font-serif text-xl font-semibold leading-snug md:text-[22px]">{kit.name}</h3>
                  {kit.shortDesc && <p className="text-sm text-slate">{kit.shortDesc}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <span className="text-lg font-bold">{formatPrice(kit.price)}</span>
                    <Link href={`/product/${kit.slug}`} className="btn btn-navy min-h-[44px] px-4">
                      View kit
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
