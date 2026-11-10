"use client";

// apps/web/app/(home)/page.jsx — storefront homepage.
//
// The page only loads data and arranges sections; each section lives in
// components/home. Header, footer and the mobile bottom bar come from
// app/layout.tsx. Every section that depends on store data hides itself
// when there is nothing real to show.

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/auth";
import { findCategory, getCategories, getProducts } from "../../lib/catalog";
import Hero from "../../components/home/Hero";
import TrustStrip from "../../components/home/TrustStrip";
import CategoryRow from "../../components/home/CategoryRow";
import DailyEssentials from "../../components/home/DailyEssentials";
import BestSellers from "../../components/home/BestSellers";
import PoojaKits from "../../components/home/PoojaKits";
import ShopByOccasion from "../../components/home/ShopByOccasion";
import WhyChooseUs from "../../components/home/WhyChooseUs";

// The homepage finds its two special categories by name, so they can be
// created and renamed in Admin without a code change:
//   • "Daily Pooja Essentials" → any category with "daily" in its name/slug
//   • "Pooja Kits"             → any category with "kit" in its name/slug
const DAILY_CATEGORY = /daily/i;
const KITS_CATEGORY = /kit/i;

const ESSENTIALS_LIMIT = 8;
const BEST_SELLERS_LIMIT = 4;
const KITS_LIMIT = 3;
const FESTIVALS_LIMIT = 4;

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [essentials, setEssentials] = useState({ products: [], loading: true, error: "", href: "/shop" });
  const [bestSellers, setBestSellers] = useState([]);
  const [kits, setKits] = useState({ products: [], href: "/shop" });
  const [festivals, setFestivals] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cats = await getCategories();
      if (cancelled) return;
      setCategories(cats);

      const dailyCat = findCategory(cats, DAILY_CATEGORY);
      const kitsCat = findCategory(cats, KITS_CATEGORY);

      // Daily essentials: the daily category if it exists, otherwise the
      // products marked "Featured" in Admin.
      const essentialsQuery = dailyCat
        ? { categoryId: dailyCat._id, limit: ESSENTIALS_LIMIT, sortBy: "sold", sortOrder: "desc" }
        : { isFeatured: true, limit: ESSENTIALS_LIMIT };

      const [essentialsRes, sellersRes, kitsRes] = await Promise.all([
        getProducts(essentialsQuery),
        getProducts({ limit: BEST_SELLERS_LIMIT, sortBy: "sold", sortOrder: "desc" }),
        kitsCat ? getProducts({ categoryId: kitsCat._id, limit: KITS_LIMIT }) : Promise.resolve({ ok: true, products: [] }),
      ]);
      if (cancelled) return;

      setEssentials({
        products: essentialsRes.products,
        loading: false,
        error: essentialsRes.ok ? "" : essentialsRes.message,
        href: dailyCat ? `/category/${dailyCat.slug}` : "/shop",
      });
      // "Best sellers" must mean it: only products that have real sales.
      setBestSellers(sellersRes.products.filter((p) => p.sold > 0));
      setKits({ products: kitsRes.products, href: kitsCat ? `/category/${kitsCat.slug}` : "/shop" });
    }

    load();

    apiFetch("/cms/festivals-public")
      .then(({ ok, body }) => {
        if (!cancelled && ok) setFestivals((body?.data?.items || []).slice(0, FESTIVALS_LIMIT));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Hero essentialsHref={essentials.href} kitsHref={kits.href} />
      <TrustStrip />
      <CategoryRow categories={categories} />
      <DailyEssentials
        products={essentials.products}
        loading={essentials.loading}
        error={essentials.error}
        href={essentials.href}
      />
      <BestSellers products={bestSellers} />
      <PoojaKits products={kits.products} href={kits.href} />
      <ShopByOccasion festivals={festivals} />
      <WhyChooseUs />
    </>
  );
}