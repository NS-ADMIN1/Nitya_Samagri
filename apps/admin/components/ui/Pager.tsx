"use client";

// apps/admin/components/ui/Pager.tsx — "Showing 1–20 of 248" with Previous / Next.

import Button from "./Button";

interface PagerProps {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}

export default function Pager({ page, limit, total, onPage }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-[13px] text-slate">
        {total === 0 ? "No results" : `Showing ${from.toLocaleString("en-IN")}–${to.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
