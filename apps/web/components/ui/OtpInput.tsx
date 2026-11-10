"use client";

// components/ui/OtpInput.tsx — six single-digit boxes for a one-time code.
// `value` is the digits entered so far (0–6 characters). Typing moves
// forward, Backspace moves back, and a pasted code — or one filled in from
// the SMS — spreads across the boxes.

import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

const LENGTH = 6;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function OtpInput({ value, onChange, disabled = false }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (index: number) => refs.current[Math.max(0, Math.min(index, LENGTH - 1))]?.focus();

  const handleChange = (index: number, raw: string) => {
    let digits = raw.replace(/\D/g, "");

    // Box emptied: keep only the digits before it.
    if (!digits) {
      onChange(value.slice(0, index));
      return;
    }

    // Typing over a filled box gives "old + new" — keep the new digit.
    const existing = value[index];
    if (existing && digits.length === 2) {
      digits = digits.replace(existing, "") || existing;
    }

    const next = (value.slice(0, index) + digits).slice(0, LENGTH);
    onChange(next);
    focus(next.length);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      onChange(value.slice(0, index - 1));
      focus(index - 1);
    }
    if (e.key === "ArrowLeft") focus(index - 1);
    if (e.key === "ArrowRight") focus(index + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!digits) return;
    e.preventDefault();
    onChange(digits);
    focus(digits.length);
  };

  return (
    <div role="group" aria-label="6-digit OTP" className="flex gap-2">
      {Array.from({ length: LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          className="h-12 w-11 rounded border border-field bg-white text-center text-lg font-bold text-navy"
        />
      ))}
    </div>
  );
}
