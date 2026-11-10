// components/checkout/PaymentMethods.jsx
//
// Two real choices. Every online method (UPI, cards, net banking, wallets)
// opens the same Razorpay window, where the customer picks one — so they
// are offered as a single option. The `id` is the paymentMethod value sent
// to POST /orders.

export const PAYMENT_METHODS = [
  {
    id: "razorpay",
    label: "Pay online",
    note: "UPI, credit or debit card, net banking or wallet, through Razorpay",
  },
  {
    id: "cod",
    label: "Cash on delivery",
    note: "Pay in cash when your order arrives",
  },
];

export default function PaymentMethods({ value, onChange, disabled = false }) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="sr-only">Choose how to pay</legend>
      {PAYMENT_METHODS.map((m) => {
        const checked = value === m.id;
        return (
          <label
            key={m.id}
            className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded px-4 py-3 ${
              checked ? "border-2 border-navy" : "border border-field hover:border-navy"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              checked={checked}
              onChange={() => onChange(m.id)}
              className="h-[18px] w-[18px] shrink-0 accent-navy"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{m.label}</span>
              <span className="text-[13px] text-slate">{m.note}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
