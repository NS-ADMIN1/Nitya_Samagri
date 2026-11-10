"use client";

// apps/web/app/product/[slug]/page.jsx — product detail.
//
// Everything on this page comes from GET /api/v1/products/:slug
// (backend/src/modules/products/product.routes.ts): the product, its pack
// sizes (variants), its approved reviews and related products. Anything the
// backend does not hold — certifications, delivery promises, return
// windows — is not shown.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/auth";
import { useCartStore } from "../../../lib/cartStore";
import { discountPercent, formatPrice } from "../../../lib/format";
import { normalizeProduct } from "../../../lib/normalize";
import Accordion, { AccordionItem } from "../../../components/ui/Accordion";
import Icon from "../../../components/ui/Icon";
import QuantityStepper from "../../../components/ui/QuantityStepper";
import Stars from "../../../components/ui/Stars";
import PackSizePicker from "../../../components/product/PackSizePicker";
import ProductGallery from "../../../components/product/ProductGallery";
import ProductGrid from "../../../components/product/ProductGrid";
import ProductReviews, { normalizeReviews } from "../../../components/product/ProductReviews";
import StickyBuyBar from "../../../components/product/StickyBuyBar";

const RELATED_LIMIT = 4;

// Adds the page-only fields on top of the shared product shape.
function toDetail(apiProduct, apiRelated) {
  const base = normalizeProduct(apiProduct);
  const reviews = normalizeReviews(apiProduct.reviews);
  const reviewCount = apiProduct.reviewCount ?? reviews.length;

  // The API returns at most the ten latest reviews, so an average is only
  // exact — and only shown — when every review is in hand.
  const averageRating =
    reviews.length > 0 && reviews.length === reviewCount
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  const details = [
    ["SKU", apiProduct.sku],
    ["Category", apiProduct.categoryId?.name],
    ["Weight", apiProduct.weight ? `${apiProduct.weight} g` : ""],
    ["HSN code", apiProduct.hsnCode],
    ["GST", apiProduct.gstPct != null ? `${apiProduct.gstPct}%` : ""],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return {
    ...base,
    categorySlug: apiProduct.categoryId?.slug || "",
    description: apiProduct.description || "",
    lowStockAt: apiProduct.lowStockAt ?? 0,
    images: [...new Set(base.variants.map((v) => v.imageUrl).filter(Boolean))],
    details,
    reviews,
    reviewCount,
    averageRating,
    related: (apiRelated || []).slice(0, RELATED_LIMIT).map(normalizeProduct),
  };
}

function StockLine({ stock, lowStockAt }) {
  if (!(stock > 0)) {
    return <p className="text-sm font-semibold text-danger">Out of stock</p>;
  }
  const low = lowStockAt > 0 && stock <= lowStockAt;
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold ${low ? "text-gold-ink" : "text-success"}`}>
      <Icon name="check" size={18} />
      {low ? `Only ${stock} left` : "In stock"}
    </p>
  );
}

export default function ProductPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [variant, setVariant] = useState(null); // selected pack size, if the product has any
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(null);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    setStatus("loading");
    setProduct(null);
    setVariant(null);
    setQty(1);

    apiFetch(`/products/${slug}`)
      .then(({ ok, status: httpStatus, body }) => {
        if (cancelled) return;
        if (!ok) {
          setStatus(httpStatus === 404 ? "notFound" : "error");
          return;
        }
        const detail = toDetail(body.data.product, body.data.related);
        setProduct(detail);
        // Start on the first pack size that can actually be bought.
        setVariant(detail.variants.find((v) => v.stock > 0) || detail.variants[0] || null);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="site-container grid animate-pulse gap-8 py-8 md:grid-cols-2 md:gap-14 md:py-10" aria-busy="true">
        <div className="aspect-square rounded-md bg-mist" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-1/4 rounded bg-mist" />
          <div className="h-10 w-3/4 rounded bg-mist" />
          <div className="h-8 w-1/3 rounded bg-mist" />
          <div className="h-24 rounded bg-mist" />
          <div className="h-12 rounded bg-mist" />
        </div>
        <span className="sr-only">Loading product…</span>
      </div>
    );
  }

  if (status === "notFound" || status === "error") {
    return (
      <div className="site-container flex flex-col items-start gap-4 py-14">
        <h1 className="heading-display text-[28px] md:text-[38px]">
          {status === "notFound" ? "Product not found" : "Something went wrong"}
        </h1>
        <p className="text-slate" role={status === "error" ? "alert" : undefined}>
          {status === "notFound"
            ? "It may have been removed, or the link is incorrect."
            : "We couldn't load this product. Please check your connection and try again."}
        </p>
        <Link href="/shop" className="btn btn-navy">
          Browse all products
        </Link>
      </div>
    );
  }

  // Price and stock follow the selected pack size when the product has them.
  const price = variant ? variant.price : product.price;
  const mrp = variant ? variant.mrp : product.mrp;
  const stock = variant ? variant.stock : product.stock;
  const inStock = stock > 0;
  const discount = discountPercent(mrp, price);

  const addToCart = () => {
    addItem(
      {
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        variantLabel: variant?.label,
        price,
        mrp,
        category: product.category,
        gstPct: product.gstPct,
        image: variant?.imageUrl || product.images[0] || undefined,
      },
      qty
    );
  };

  const handleAdd = () => {
    addToCart();
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addToCart();
    router.push("/cart");
  };

  const selectVariant = (v) => {
    setVariant(v);
    setQty(1);
  };

  return (
    <>
      <div className="site-container pt-4 md:pt-5">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate">
            <li>
              <Link href="/" className="inline-flex min-h-[32px] items-center hover:text-navy">
                Home
              </Link>
            </li>
            {product.category && (
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true">/</span>
                <Link
                  href={product.categorySlug ? `/category/${product.categorySlug}` : "/shop"}
                  className="inline-flex min-h-[32px] items-center hover:text-navy"
                >
                  {product.category}
                </Link>
              </li>
            )}
            <li className="flex items-center gap-x-2">
              <span aria-hidden="true">/</span>
              <span aria-current="page">{product.name}</span>
            </li>
          </ol>
        </nav>
      </div>

      <div className="site-container grid gap-8 pb-10 pt-4 md:grid-cols-2 md:gap-14 md:pb-14 md:pt-6">
        <ProductGallery images={product.images} activeImage={variant?.imageUrl} alt={product.name} />

        <div className="flex min-w-0 flex-col gap-4 md:gap-[18px]">
          {product.category && <p className="eyebrow">{product.category}</p>}
          <h1 className="heading-display text-[26px] md:text-[38px]">{product.name}</h1>

          {product.reviewCount > 0 && (
            <a href="#reviews" className="flex flex-wrap items-center gap-2 text-sm text-slate hover:text-navy">
              {product.averageRating != null && (
                <>
                  <Stars rating={product.averageRating} />
                  <span className="font-semibold text-navy">{product.averageRating}</span>
                </>
              )}
              <span className="underline">
                {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}
              </span>
            </a>
          )}

          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[28px] font-bold md:text-[32px]">{formatPrice(price)}</span>
              {discount > 0 && (
                <>
                  <s className="text-base text-slate">
                    <span className="sr-only">MRP </span>
                    {formatPrice(mrp)}
                  </s>
                  <span className="rounded-sm bg-navy px-2 py-1 text-xs font-semibold text-white">{discount}% OFF</span>
                </>
              )}
            </p>
            {/* The cart adds GST on top of this price (see cart totals). */}
            {product.gstPct > 0 && <p className="text-[13px] text-slate">Plus {product.gstPct}% GST, added at checkout</p>}
          </div>

          {product.shortDesc && <p className="text-base leading-relaxed text-slate">{product.shortDesc}</p>}

          <PackSizePicker variants={product.variants} selectedId={variant?.id} onSelect={selectVariant} />

          <div className="flex flex-wrap items-stretch gap-3">
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, stock)} />
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAdd}
              aria-live="polite"
              className={`btn min-h-[52px] flex-1 basis-[160px] ${added ? "btn-navy" : "btn-gold"}`}
            >
              {!inStock ? (
                "Out of stock"
              ) : added ? (
                <>
                  <Icon name="check" size={16} /> Added to cart
                </>
              ) : (
                "Add to cart"
              )}
            </button>
            <button
              type="button"
              disabled={!inStock}
              onClick={handleBuyNow}
              className="btn btn-navy hidden min-h-[52px] flex-1 basis-[160px] md:inline-flex"
            >
              Buy now
            </button>
          </div>

          <StockLine stock={stock} lowStockAt={product.lowStockAt} />

          <ul className="flex flex-wrap gap-x-6 gap-y-2 rounded-md border border-line bg-offwhite p-4 text-[13px] text-slate">
            <li className="flex items-center gap-2">
              <Icon name="lock" size={18} /> Secure payment by Razorpay
            </li>
            <li className="flex items-center gap-2">
              <Icon name="truck" size={18} /> Track your order from your account
            </li>
          </ul>
        </div>
      </div>

      <div className="site-container pb-12 md:pb-16">
        <Accordion>
          {product.description && (
            <AccordionItem title="Description" defaultOpen>
              <p className="max-w-[760px] whitespace-pre-line">{product.description}</p>
            </AccordionItem>
          )}
          {product.details.length > 0 && (
            <AccordionItem title="Product details" defaultOpen={!product.description}>
              <dl className="grid max-w-[520px] grid-cols-[140px_1fr] gap-x-4 gap-y-2">
                {product.details.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="font-medium text-navy">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </AccordionItem>
          )}
          <div id="reviews" className="scroll-mt-40">
            <AccordionItem title={`Reviews (${product.reviewCount})`} defaultOpen={product.reviewCount > 0}>
              <ProductReviews reviews={product.reviews} reviewCount={product.reviewCount} />
            </AccordionItem>
          </div>
        </Accordion>
      </div>

      {product.related.length > 0 && (
        <section aria-labelledby="related-products" className="border-t border-line bg-offwhite">
          <div className="site-container section flex flex-col gap-6 md:gap-7">
            <h2 id="related-products" className="heading-display text-[26px] md:text-[34px]">
              {product.category ? `More from ${product.category}` : "You may also need"}
            </h2>
            <ProductGrid products={product.related} />
          </div>
        </section>
      )}

      <StickyBuyBar price={price} disabled={!inStock} added={added} onAdd={handleAdd} onBuyNow={handleBuyNow} />
    </>
  );
}