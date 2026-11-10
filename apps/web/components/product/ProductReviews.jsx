// components/product/ProductReviews.jsx
// Approved reviews returned with the product (GET /products/:slug sends the
// ten most recent). Nothing is shown that a customer did not write.

import Link from "next/link";
import Stars from "../ui/Stars";

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProductReviews({ reviews, reviewCount }) {
  if (!reviews || reviews.length === 0) {
    return (
      <p>
        No reviews yet. If you have received this product, you can review it from{" "}
        <Link href="/reviews" className="font-semibold text-navy underline">
          My Reviews
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-5">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 border-b border-mist pb-5 last:border-b-0 last:pb-0">
            <Stars rating={r.rating} />
            {r.title && <p className="font-semibold text-navy">{r.title}</p>}
            {r.comment && <p>{r.comment}</p>}
            <p className="text-[13px]">
              <span className="font-semibold text-navy">{r.name}</span>
              {r.verified && <span> · Verified purchase</span>}
              {r.date && <span> · {r.date}</span>}
            </p>
          </li>
        ))}
      </ul>
      {reviewCount > reviews.length && (
        <p className="text-[13px]">
          Showing the {reviews.length} most recent of {reviewCount} reviews.
        </p>
      )}
    </div>
  );
}

// Maps the API's review documents to what the list renders.
export function normalizeReviews(apiReviews = []) {
  return apiReviews.map((r) => ({
    id: r._id,
    rating: r.rating,
    title: r.title || "",
    comment: r.comment || "",
    name: r.userId?.name || "Customer",
    verified: !!r.isVerifiedPurchase,
    date: formatDate(r.createdAt),
  }));
}
