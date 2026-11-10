// components/ui/Stars.jsx — a 1–5 star rating, read out as text.

const STAR = "M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1 5.900L12 16.900 6.800 19.700l1-5.900L3.500 9.700l5.900-.800z";

/**
 * @param {{ rating?: number, size?: number, className?: string }} props
 */
export default function Stars({ rating = 0, size = 16, className = "" }) {
  const filled = Math.round(Number(rating) || 0);
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={`inline-flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
          <path
            d={STAR}
            className={n <= filled ? "fill-gold stroke-gold-ink" : "fill-white stroke-field"}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
