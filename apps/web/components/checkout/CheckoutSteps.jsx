// components/checkout/CheckoutSteps.jsx — where the customer is in checkout.

import Icon from "../ui/Icon";

export default function CheckoutSteps({ steps, current }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-3 md:gap-x-7">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-x-4 md:gap-x-7" aria-current={active ? "step" : undefined}>
            {i > 0 && <span aria-hidden="true" className="hidden h-px w-10 bg-field sm:block md:w-14" />}
            <span className={`flex items-center gap-2.5 text-sm ${done || active ? "font-semibold text-navy" : "font-medium text-slate"}`}>
              <span
                className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border text-[13px] font-bold ${
                  done
                    ? "border-navy bg-navy text-white"
                    : active
                      ? "border-gold bg-gold text-navy"
                      : "border-field bg-white text-slate"
                }`}
              >
                {done ? <Icon name="check" size={16} /> : i + 1}
              </span>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
