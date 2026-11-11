"use client";

// apps/admin/components/ui/Toggle.tsx — on/off switch (show on store, enable coupon…).

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** What the switch controls, e.g. "Show Sandal agarbatti on store". */
  label: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-[26px] w-11 shrink-0 rounded-full p-[3px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "justify-end bg-navy" : "justify-start bg-[#B4BAC6]"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(7,28,66,0.3)]" />
    </button>
  );
}
