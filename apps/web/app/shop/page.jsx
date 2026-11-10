"use client";

// apps/web/app/shop/page.jsx — all products, with filters and sort.
//
// URL parameters:
//   /shop?q=kapoor          text search (set by the header search box)
//   /shop?category=<slug>   open with one category preselected

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCategories } from "../../lib/catalog";
import ListingHeader from "../../components/shop/ListingHeader";
import ProductListing from "../../components/shop/ProductListing";

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTerm = (searchParams.get("q") || "").trim();
  const categorySlug = searchParams.get("category") || "";

  // ?category= carries a slug; the products API filters by category id.
  const [initialCategoryId, setInitialCategoryId] = useState("");
  useEffect(() => {
    if (!categorySlug) {
      setInitialCategoryId("");
      return;
    }
    let cancelled = false;
    getCategories().then((items) => {
      if (cancelled) return;
      setInitialCategoryId(items.find((c) => c.slug === categorySlug)?._id || "");
    });
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  return (
    <>
      <ListingHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "All Products" }]}
        title={searchTerm ? `Results for “${searchTerm}”` : "All Products"}
        description={searchTerm ? "" : "Everything for your daily pooja, under one roof."}
      />
      <ProductListing
        searchTerm={searchTerm}
        onClearSearch={() => router.replace("/shop")}
        initialCategoryId={initialCategoryId}
      />
    </>
  );
}

export default function ShopPage() {
  // useSearchParams needs a Suspense boundary so the page can still be
  // statically generated at build time.
  return (
    <Suspense fallback={<div className="site-container py-16 text-center text-sm text-slate">Loading…</div>}>
      <ShopContent />
    </Suspense>
  );
}