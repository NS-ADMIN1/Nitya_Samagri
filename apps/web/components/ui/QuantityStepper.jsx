// components/ui/QuantityStepper.jsx — minus / count / plus, 44px targets.

export default function QuantityStepper({ value, onChange, min = 1, max = 99, label = "Quantity", className = "" }) {
  const set = (next) => onChange(Math.max(min, Math.min(max, next)));

  return (
    <div role="group" aria-label={label} className={`inline-flex items-center rounded border border-field bg-white ${className}`}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className="inline-flex h-12 w-11 items-center justify-center text-xl disabled:opacity-40"
      >
        −
      </button>
      <span aria-live="polite" className="min-w-[36px] text-center font-semibold">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => set(value + 1)}
        className="inline-flex h-12 w-11 items-center justify-center text-xl disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
