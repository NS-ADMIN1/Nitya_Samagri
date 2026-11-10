"use client";

// components/checkout/CartLineItem.jsx — one row in the cart.
// Pass editable={false} for the read-only list on the payment step.

import { useCartStore } from "../../lib/cartStore";
import { formatPrice } from "../../lib/format";
import Icon from "../ui/Icon";
import PhotoPlaceholder from "../ui/PhotoPlaceholder";
import QuantityStepper from "../ui/QuantityStepper";

export default function CartLineItem({ item, editable = true }) {
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line py-4 first:border-t-0 first:pt-0 md:gap-x-5">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded bg-mist md:h-24 md:w-24">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <PhotoPlaceholder size={26} />
        )}
      </div>

      <div className="flex min-w-[150px] flex-1 flex-col gap-1">
        <p className="text-[15px] font-semibold leading-snug">{item.name}</p>
        <p className="text-[13px] text-slate">
          {item.variantLabel ? `${item.variantLabel} · ` : ""}
          {formatPrice(item.price)} each
          {!editable && ` · Qty ${item.qty}`}
        </p>
        {editable && (
          <button
            type="button"
            onClick={() => removeItem(item.productId, item.variantId)}
            className="inline-flex min-h-[36px] items-center gap-1.5 self-start text-[13px] text-slate hover:text-danger"
          >
            <Icon name="trash" size={16} />
            Remove<span className="sr-only"> {item.name}</span>
          </button>
        )}
      </div>

      {editable && (
        <QuantityStepper
          value={item.qty}
          onChange={(next) => setQty(item.productId, item.variantId, next)}
          label={`Quantity of ${item.name}`}
        />
      )}

      <p className="min-w-[84px] text-right text-base font-bold">{formatPrice(item.price * item.qty)}</p>
    </li>
  );
}
