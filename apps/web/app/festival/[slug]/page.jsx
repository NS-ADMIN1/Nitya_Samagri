"use client";

// apps/web/app/festival/[slug]/page.jsx — one festival collection.
//
// GET /cms/festivals-public/:slug gives the festival and the ids of its
// products. The products themselves are then loaded through GET /products
// (?ids=…), the same call every other listing uses, so each card has its
// category, pack sizes, stock and photo — and only active products appear.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/auth";
import { getProducts } from "../../../lib/catalog";
import { formatDate } from "../../../lib/format";
import ProductGrid, { ProductGridSkeleton } from "../../../components/product/ProductGrid";

const MAX_PRODUCTS = 100; // the most GET /products returns in one page

export default function FestivalPage() {
  const { slug } = useParams();
  const [festival, setFestival] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setFestival(null);
    setProducts([]);
    setError("");

    (async () => {
      try {
        const { ok, status: httpStatus, body } = await apiFetch(`/cms/festivals-public/${slug}`);
        if (cancelled) return;
        if (httpStatus === 404) {
          setStatus("notFound");
          return;
        }
        if (!ok) throw new Error(body?.message || "Couldn't load this festival collection.");

        const item = body.data.item;
        // productIds arrives populated (full documents) — only the ids are needed.
        const ids = (item.productIds || []).map((p) => (p && typeof p === "object" ? p._id : p)).filter(Boolean);

        let list = [];
        if (ids.length > 0) {
          const res = await getProducts({ ids: ids.join(","), limit: MAX_PRODUCTS });
          if (cancelled) return;
          if (!res.ok) throw new Error(res.message);
          // Keep the order the festival's products were arranged in.
          const position = new Map(ids.map((id, i) => [String(id), i]));
          list = [...res.products].sort((a, b) => (position.get(String(a.id)) ?? 0) - (position.get(String(b.id)) ?? 0));
        }

        setFestival(item);
        setProducts(list);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't reach the server. Please try again.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "notFound" || status === "error") {
    return (
      <div className="site-container flex flex-col items-start gap-4 py-14">
        <h1 className="heading-display text-[28px] md:text-[38px]">
          {status === "notFound" ? "Festival collection not found" : "Something went wrong"}
        </h1>
        <p className="text-slate" role={status === "error" ? "alert" : undefined}>
          {status === "notFound" ? "This collection isn't available right now." : error}
        </p>
        <Link href="/festival" className="btn btn-navy">
          See all festival collections
        </Link>
      </div>
    );
  }

  const live = festival?.status === "active";
  const starts = formatDate(festival?.startDate);
  const ends = formatDate(festival?.endDate);

  return (
    <>
      <div className="relative overflow-hidden bg-navy text-white">
        {festival?.bannerImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={festival.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {/* Navy wash keeps the text readable over any photo */}
            <div aria-hidden="true" className="absolute inset-0 bg-navy/75" />
          </>
        )}
        <div className="site-container relative flex flex-col gap-3 py-9 md:py-14">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate-light">
              <li>
                <Link href="/" className="inline-flex min-h-[32px] items-center hover:text-gold">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true">/</span>
                <Link href="/festival" className="inline-flex min-h-[32px] items-center hover:text-gold">
                  Festival Samagri
                </Link>
              </li>
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true">/</span>
                <span aria-current="page">{festival?.name || "…"}</span>
              </li>
            </ol>
          </nav>

          {festival ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {live ? "Live now" : "Coming soon"}
                {starts && ends ? ` · ${starts} – ${ends}` : ""}
              </p>
              <h1 className="font-serif text-[32px] font-semibold leading-tight md:text-5xl">{festival.name}</h1>
              {festival.description && (
                <p className="max-w-[640px] text-[15px] leading-relaxed text-slate-light md:text-[17px]">
                  {festival.description}
                </p>
              )}
            </>
          ) : (
            <div aria-hidden="true" className="h-[120px]" />
          )}
        </div>
      </div>

      <section aria-labelledby="festival-products" className="site-container section flex flex-col gap-6 md:gap-7">
        <h2 id="festival-products" className="heading-display text-[26px] md:text-[34px]">
          Festival essentials
        </h2>

        {status === "loading" ? (
          <ProductGridSkeleton count={4} />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-md border border-line bg-offwhite p-6">
            <p className="text-slate">Products for this festival will be listed here soon.</p>
            <Link href="/shop" className="btn btn-navy">
              Shop all products
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </>
  );
}