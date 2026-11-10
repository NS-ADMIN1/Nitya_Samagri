"use client";

// apps/web/app/festival/page.jsx — all festival collections.
// Active and upcoming festivals from GET /cms/festivals-public, which are
// created and scheduled in Admin → Store.

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import ListingHeader from "../../components/shop/ListingHeader";
import Icon from "../../components/ui/Icon";

function FestivalCard({ festival }) {
  const live = festival.status === "active";
  const productCount = (festival.productIds || []).length;
  const starts = formatDate(festival.startDate);

  return (
    <Link
      href={`/festival/${festival.slug}`}
      className="group flex h-full flex-col gap-3 rounded-md border border-line border-t-[3px] border-t-gold bg-white p-5 transition-shadow hover:shadow-elevated md:p-6"
    >
      <p className="eyebrow">{live ? "Live now" : starts ? `Starts ${starts}` : "Coming soon"}</p>
      <h2 className="heading-display text-2xl md:text-[26px]">{festival.name}</h2>
      {festival.description && <p className="text-sm leading-relaxed text-slate">{festival.description}</p>}
      <p className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm">
        <span className="text-slate">
          {productCount} product{productCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold">
          Explore
          <Icon name="chevronRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </p>
    </Link>
  );
}

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/cms/festivals-public")
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          setError(body?.message || "Couldn't load the festival collections.");
          return;
        }
        setFestivals(body?.data?.items || []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <ListingHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Festival Samagri" }]}
        title="Festival Samagri"
        description="Everything you need for each festival's pooja, gathered in one place."
      />

      <div className="site-container pb-14 pt-6 md:pb-[72px] md:pt-9">
        {loading ? (
          <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[200px] animate-pulse rounded-md bg-mist" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-md border border-line bg-offwhite p-8 text-center text-sm text-danger">
            {error}
          </p>
        ) : festivals.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-md border border-line bg-offwhite px-6 py-12 text-center">
            <p className="font-serif text-xl font-semibold">No festival collections right now</p>
            <p className="max-w-[420px] text-sm text-slate">
              Collections appear here ahead of each festival. Until then, the daily essentials are always available.
            </p>
            <Link href="/shop" className="btn btn-navy">
              Shop all products
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {festivals.map((f) => (
              <li key={f._id}>
                <FestivalCard festival={f} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}