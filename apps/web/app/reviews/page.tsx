"use client";

// apps/web/app/reviews/page.tsx — the customer's own reviews.
//
//   To review    GET /reviews/pending   delivered products not yet reviewed
//   Your reviews GET /reviews/mine
//   Write        POST /reviews          { productId, rating, comment? }
//   Delete       DELETE /reviews/:id
//
// Reviews are published as soon as they are submitted (the backend approves
// them automatically), and appear on the product's page.

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { apiFetch, isLoggedIn } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import StarRatingInput from "../../components/ui/StarRatingInput";
import Stars from "../../components/ui/Stars";

const MAX_COMMENT_LENGTH = 2000; // ReviewCreateSchema on the backend

type PendingItem = { productId: string; productSlug?: string; name: string; orderId?: string; deliveredOn?: string };
type RawReview = {
  _id: string;
  productId?: { name?: string; slug?: string } | null;
  rating: number;
  title?: string;
  comment?: string;
  createdAt?: string;
};
type Tab = "pending" | "submitted";

function ReviewForm({
  item,
  submitting,
  onSubmit,
  onCancel,
}: {
  item: PendingItem;
  submitting: boolean;
  onSubmit: (values: { rating: number; comment: string }) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const fieldId = `review-${item.productId}`;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setError("");
    onSubmit({ rating, comment: comment.trim() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 border-t border-line pt-4">
      <StarRatingInput name={`${fieldId}-rating`} value={rating} onChange={setRating} disabled={submitting} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-[13px] font-semibold">
          Your review (optional)
        </label>
        <textarea
          id={fieldId}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          rows={4}
          disabled={submitting}
          placeholder="What did you think of this product?"
          className="input min-h-[112px] resize-y py-3"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className="btn btn-gold">
          {submitting ? "Submitting…" : "Submit review"}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting} className="btn btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ReviewsPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null until checked in the browser
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [submitted, setSubmitted] = useState<RawReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [writingId, setWritingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, mineRes] = await Promise.all([
        apiFetch<{ data: { pending: PendingItem[] } }>("/reviews/pending"),
        apiFetch<{ data: { reviews: RawReview[] } }>("/reviews/mine"),
      ]);
      if (!pendingRes.ok) throw new Error(pendingRes.body.message || "We couldn't load the products waiting for a review.");
      if (!mineRes.ok) throw new Error(mineRes.body.message || "We couldn't load your reviews.");
      setPending(pendingRes.body.data.pending || []);
      setSubmitted(mineRes.body.data.reviews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const signedIn = isLoggedIn();
    setLoggedIn(signedIn);
    if (signedIn) load();
    else setLoading(false);
  }, []);

  const submitReview = async (item: PendingItem, values: { rating: number; comment: string }) => {
    setSubmitting(true);
    setError("");
    try {
      const { ok, body } = await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: item.productId,
          rating: values.rating,
          ...(values.comment ? { comment: values.comment } : {}),
        }),
      });
      if (!ok) throw new Error(body.message || "We couldn't submit your review. Please try again.");
      setWritingId(null);
      setTab("submitted");
      await load(); // both lists change, so take them from the server
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (id: string) => {
    setDeletingId(id);
    setError("");
    try {
      const { ok, body } = await apiFetch(`/reviews/${id}`, { method: "DELETE" });
      if (!ok) throw new Error(body.message || "We couldn't delete this review.");
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: `To review (${pending.length})` },
    { id: "submitted", label: `Your reviews (${submitted.length})` },
  ];

  return (
    <>
      <div className="border-b border-line bg-offwhite">
        <div className="site-container flex flex-col gap-2.5 py-6 md:py-7">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate">
              <li>
                <Link href="/account" className="inline-flex min-h-[32px] items-center hover:text-navy">
                  My Account
                </Link>
              </li>
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true">/</span>
                <span aria-current="page">My Reviews</span>
              </li>
            </ol>
          </nav>
          <h1 className="heading-display text-[28px] md:text-[40px]">My Reviews</h1>
          <p className="max-w-[640px] text-slate">Rate the products you have received. Your review appears on the product's page.</p>
        </div>
      </div>

      <div className="site-container flex max-w-[860px] flex-col gap-5 pb-14 pt-6 md:pb-[72px] md:pt-9">
        {loggedIn === false ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-slate">Please log in to see and write your reviews.</p>
            <Link href="/login?next=/reviews" className="btn btn-gold">
              Log in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p role="alert" className="rounded border border-danger p-4 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <div role="group" aria-label="Choose a list" className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm font-medium ${
                    tab === t.id ? "border-navy bg-navy text-white" : "border-field bg-white text-navy hover:border-navy"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-sm text-slate">Loading…</p>
            ) : tab === "pending" ? (
              pending.length === 0 ? (
                <div className="flex flex-col items-start gap-4 rounded-md border border-line bg-offwhite p-6">
                  <p className="text-slate">
                    Nothing to review right now. Products appear here once an order has been delivered.
                  </p>
                  <Link href="/account" className="btn btn-navy">
                    View my orders
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {pending.map((item) => (
                    <li key={item.productId} className="flex flex-col gap-4 rounded-md border border-line p-4 md:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                          <p className="text-[15px] font-semibold">
                            {item.productSlug ? (
                              <Link href={`/product/${item.productSlug}`} className="hover:text-navy-hover">
                                {item.name}
                              </Link>
                            ) : (
                              item.name
                            )}
                          </p>
                          <p className="text-[13px] text-slate">
                            {item.orderId ? `Order ${item.orderId}` : ""}
                            {item.orderId && item.deliveredOn ? " · " : ""}
                            {item.deliveredOn ? `Delivered ${formatDate(item.deliveredOn)}` : ""}
                          </p>
                        </div>
                        {writingId !== item.productId && (
                          <button type="button" onClick={() => setWritingId(item.productId)} className="btn btn-gold min-h-[44px] px-4">
                            Write a review
                          </button>
                        )}
                      </div>
                      {writingId === item.productId && (
                        <ReviewForm
                          item={item}
                          submitting={submitting}
                          onSubmit={(values) => submitReview(item, values)}
                          onCancel={() => setWritingId(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )
            ) : submitted.length === 0 ? (
              <p className="rounded-md border border-line bg-offwhite p-6 text-slate">You have not written any reviews yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {submitted.map((r) => (
                  <li key={r._id} className="flex flex-col gap-2.5 rounded-md border border-line p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <p className="text-[15px] font-semibold">
                        {r.productId?.slug ? (
                          <Link href={`/product/${r.productId.slug}`} className="hover:text-navy-hover">
                            {r.productId.name || "Product"}
                          </Link>
                        ) : (
                          r.productId?.name || "Product no longer available"
                        )}
                      </p>
                      <span className="text-[13px] text-slate">{formatDate(r.createdAt)}</span>
                    </div>
                    <Stars rating={r.rating} />
                    {r.title && <p className="font-semibold">{r.title}</p>}
                    {r.comment && <p className="text-sm leading-relaxed text-slate">{r.comment}</p>}

                    {confirmDeleteId === r._id ? (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-sm font-semibold">Delete this review?</span>
                        <button
                          type="button"
                          disabled={deletingId === r._id}
                          onClick={() => deleteReview(r._id)}
                          className="btn min-h-[40px] bg-danger px-3 text-white"
                        >
                          {deletingId === r._id ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r._id}
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn btn-outline min-h-[40px] px-3"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(r._id)}
                        className="min-h-[36px] self-start text-[13px] font-semibold text-slate underline hover:text-danger"
                      >
                        Delete review
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}