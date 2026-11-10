"use client";

// components/product/ProductCard.jsx — the one product card used site-wide.
// Expects a product from lib/normalize.js → normalizeProduct().

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCartStore } from "../../lib/cartStore";
import { discountPercent, formatPrice } from "../../lib/format";
import { toCartItem } from "../../lib/normalize";
import Icon from "../ui/Icon";
import PhotoPlaceholder from "../ui/PhotoPlaceholder";

export default function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const href = `/product/${product.slug}`;
  const discount = discountPercent(product.mrp, product.price);
  const hasVariants = product.variants.length > 0;

  const handleAdd = () => {
    addItem(toCartItem(product));
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className="card h-full transition-shadow duration-150 hover:shadow-elevated">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-mist" tabIndex={-1} aria-hidden="true">
        {product.image ? (
          // Product photos come from arbitrary admin-supplied URLs, so a plain
          // <img> is used instead of next/image's fixed host allow-list.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder />
        )}
        {discount > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-sm bg-navy px-2 py-1 text-[11px] font-semibold tracking-wide text-white">
            {discount}% OFF
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.category && <p className="eyebrow text-[11px]">{product.category}</p>}
        <h3 className="text-[15px] font-semibold leading-snug md:text-base">
          <Link href={href} className="hover:text-navy-hover">
            {product.name}
          </Link>
        </h3>

        <p className="text-[13px] text-slate">
          {!product.inStock
            ? "Out of stock"
            : hasVariants
              ? `${product.variants.length} pack size${product.variants.length === 1 ? "" : "s"}`
              : "In stock"}
        </p>

        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5">
          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <s className="text-[13px] text-slate">
              <span className="sr-only">MRP </span>
              {formatPrice(product.mrp)}
            </s>
          )}
        </p>

        {!product.inStock ? (
          <button type="button" disabled className="btn btn-outline mt-1.5 min-h-[44px] w-full px-3">
            Out of stock
          </button>
        ) : hasVariants ? (
          // Pack size has to be picked on the product page before adding.
          <Link href={href} className="btn btn-gold mt-1.5 min-h-[44px] w-full px-3">
            Choose pack size
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            aria-live="polite"
            className={`btn mt-1.5 min-h-[44px] w-full px-3 ${added ? "btn-navy" : "btn-gold"}`}
          >
            {added ? (
              <>
                <Icon name="check" size={16} /> Added
              </>
            ) : (
              "Add to cart"
            )}
          </button>
        )}
      </div>
    </article>
  );
}
