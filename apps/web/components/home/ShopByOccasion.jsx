// components/home/ShopByOccasion.jsx
// Active and upcoming festivals from GET /cms/festivals-public (managed in
// Admin → Store). Hidden when there are none.

import Link from "next/link";
import { formatMonthYear } from "../../lib/format";
import Icon from "../ui/Icon";
import SectionHeader from "./SectionHeader";

export default function ShopByOccasion({ festivals }) {
  if (!festivals || festivals.length === 0) return null;

  return (
    <section aria-labelledby="home-occasions" className="section">
      <div className="site-container flex flex-col gap-6 md:gap-7">
        <SectionHeader id="home-occasions" title="Shop by Occasion" href="/festival" linkLabel="All festivals" />
        <ul className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {festivals.map((f) => (
            <li key={f._id}>
              <Link
                href={`/festival/${f.slug}`}
                className="group flex h-full min-h-[150px] flex-col justify-between rounded-md bg-navy p-4 text-white transition-colors hover:bg-navy-hover md:min-h-[190px] md:p-5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                  {f.status === "active" ? "Live now" : formatMonthYear(f.startDate) || "Coming soon"}
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="font-serif text-xl font-semibold leading-tight md:text-2xl">{f.name}</span>
                  <Icon name="chevronRight" className="text-gold transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
