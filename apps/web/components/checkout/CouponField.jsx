"use client";

// components/checkout/CouponField.jsx
//
// The backend has no "check this coupon" endpoint — a code is validated
// (and its discount worked out) only inside POST /orders. So this field
// simply holds the code; the page sends it with the order and shows the
// backend's answer. No coupon codes or discounts are hardcoded here.

import { useState } from "react";

export default function CouponField({ code, onChange, disabled = false }) {
  const [input, setInput] = useState("");

  const apply = (e) => {
    e.preventDefault();
    const next = input.trim().toUpperCase();
    if (next.length < 3) return;
    onChange(next);
    setInput("");
  };

  if (code) {
    return (
      <div className="flex flex-col gap-1 rounded border border-line bg-white p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>
            Coupon <span className="font-semibold">{code}</span>
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="min-h-[32px] text-[13px] text-slate underline hover:text-navy"
          >
            Remove
          </button>
        </div>
        <p className="text-[13px] text-slate">Checked when you place the order. Any discount shows on your order total.</p>
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="flex flex-col gap-1.5">
      <label htmlFor="coupon-code" className="text-[13px] font-semibold">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Enter code"
          autoComplete="off"
          disabled={disabled}
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={disabled || input.trim().length < 3} className="btn btn-outline px-4">
          Apply
        </button>
      </div>
    </form>
  );
}
