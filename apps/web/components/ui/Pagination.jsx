// components/ui/Pagination.jsx — previous / next with the current position.

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4 pt-4">
      <button
        type="button"
        className="btn btn-outline min-h-[44px] px-4"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-slate" aria-current="page">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="btn btn-outline min-h-[44px] px-4"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
