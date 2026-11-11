"use client";

// apps/admin/components/inventory/StockStepper.tsx
//
// The one-step stock change in each Inventory row: type a quantity, then
// press plus to add it or minus to remove it.

import { useState } from "react";
import type { StockOperation } from "../../lib/inventory";
import Icon from "../ui/Icon";

interface StockStepperProps {
  productName: string;
  /** Current stock, so more than is there cannot be removed. */
  stock: number;
  busy: boolean;
  disabled?: boolean;
  /** Resolves when saved (the box is then cleared); rejects when the change failed. */
  onAdjust: (operation: StockOperation, quantity: number) => Promise<void>;
}

export default function StockStepper({ productName, stock, busy, disabled = false, onAdjust }: StockStepperProps) {
  const [value, setValue] = useState("");
  const quantity = Number(value);
  const valid = Number.isInteger(quantity) && quantity > 0;

  const run = async (operation: StockOperation) => {
    if (!valid) return;
    try {
      await onAdjust(operation, quantity);
      setValue("");
    } catch {
      // The page shows the error; the typed quantity stays so it can be corrected.
    }
  };

  const button = "flex h-11 w-11 items-center justify-center bg-white text-navy hover:bg-mist disabled:cursor-not-allowed disabled:text-[#A7AEBB] disabled:hover:bg-white";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center overflow-hidden rounded-[10px] border border-field bg-white focus-within:border-navy"
    >
      <button type="button" aria-label={`Remove this quantity from ${productName}`} disabled={disabled || busy || !valid || quantity > stock} onClick={() => run("subtract")} className={button}>
        <Icon name="minus" size={16} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        value={value}
        disabled={disabled || busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") run("add");
        }}
        aria-label={`Quantity for ${productName}`}
        placeholder={busy ? "…" : "Qty"}
        className="h-11 w-[64px] border-x border-line bg-transparent text-center font-sans text-sm font-semibold text-navy outline-none placeholder:font-normal placeholder:text-slate disabled:bg-mist"
      />
      <button type="button" aria-label={`Add this quantity to ${productName}`} disabled={disabled || busy || !valid} onClick={() => run("add")} className={button}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
