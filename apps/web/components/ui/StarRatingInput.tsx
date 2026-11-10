"use client";

// components/ui/StarRatingInput.tsx — choose a rating from 1 to 5.
// Built as a radio group so it works with the keyboard and screen readers;
// each star is a 44px target.

const STAR = "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z";
const LABELS = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"];

type Props = {
  value: number; // 0 = nothing chosen yet
  onChange: (rating: number) => void;
  name: string; // unique per form on the page
  disabled?: boolean;
};

export default function StarRatingInput({ value, onChange, name, disabled = false }: Props) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-semibold">Your rating</legend>
      <div className="flex">
        {LABELS.map((label, i) => {
          const rating = i + 1;
          return (
            <label key={rating} className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center">
              <input
                type="radio"
                name={name}
                value={rating}
                checked={value === rating}
                onChange={() => onChange(rating)}
                className="peer absolute inset-0 cursor-pointer opacity-0"
              />
              <span className="sr-only">{label}</span>
              <svg
                aria-hidden="true"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                className="rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-navy"
              >
                <path
                  d={STAR}
                  className={rating <= value ? "fill-gold stroke-gold-ink" : "fill-white stroke-field"}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
