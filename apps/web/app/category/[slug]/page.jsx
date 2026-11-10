"use client";

// apps/web/app/category/[slug]/page.jsx — one category's products.
// Loads the category (GET /categories/:slug) for its name and description,
// then shows the shared listing locked to that category.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/auth";
import ListingHeader from "../../../components/shop/ListingHeader";
import ProductListing from "../../../components/shop/ProductListing";

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCategory(null);
    setStatus("loading");
    setError("");

    apiFetch(`/categories/${slug}`)
      .then(({ ok, status: httpStatus, body }) => {
        if (cancelled) return;
        if (ok) {
          setCategory(body.data.category);
          setStatus("ready");
        } else if (httpStatus === 404) {
          setStatus("notFound");
        } else {
          setError(body?.message || "Couldn't load this category.");
          setStatus("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't reach the server. Please try again.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "All Products", href: "/shop" },
    { label: category?.name || (status === "notFound" ? "Not found" : "…") },
  ];

  if (status === "notFound" || status === "error") {
    return (
      <>
        <ListingHeader
          crumbs={crumbs}
          title={status === "notFound" ? "Category not found" : "Something went wrong"}
        />
        <div className="site-container flex flex-col items-start gap-5 py-12">
          <p className="text-slate" role={status === "error" ? "alert" : undefined}>
            {status === "notFound" ? "This category doesn't exist or is no longer available." : error}
          </p>
          <Link href="/shop" className="btn btn-navy">
            Browse all products
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <ListingHeader crumbs={crumbs} title={category?.name || "Loading…"} description={category?.description} />
      {category ? (
        <ProductListing fixedCategoryId={category._id} />
      ) : (
        <div className="site-container py-16 text-center text-sm text-slate">Loading…</div>
      )}
    </>
  );
}