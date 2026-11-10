// components/product/StickyBuyBar.jsx
// Phones only: price and the two buy buttons stay within thumb reach while
// the page scrolls. The mobile bottom nav steps aside on product pages
// (see HIDE_BOTTOM_NAV_PREFIXES in lib/theme.js).

import { formatPrice } from "../../lib/format";

export default function StickyBuyBar({ price, disabled, added, onAdd, onBuyNow }) {
  return (
    <>
      <div aria-hidden="true" className="h-[72px] md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2.5 border-t border-line bg-white px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:hidden">
        <span className="min-w-[72px] text-lg font-bold">{formatPrice(price)}</span>
        <button type="button" disabled={disabled} onClick={onBuyNow} className="btn btn-outline flex-1 px-2">
          Buy now
        </button>
        <button type="button" disabled={disabled} onClick={onAdd} className={`btn flex-[1.3] px-2 ${added ? "btn-navy" : "btn-gold"}`}>
          {disabled ? "Out of stock" : added ? "Added" : "Add to cart"}
        </button>
      </div>
    </>
  );
}
