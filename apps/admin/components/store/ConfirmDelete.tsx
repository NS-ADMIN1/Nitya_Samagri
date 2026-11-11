"use client";

// apps/admin/components/store/ConfirmDelete.tsx
//
// A delete button that asks once before deleting ("Delete" → "Yes, delete" / "Keep").

import { useState } from "react";
import Button from "../ui/Button";

interface ConfirmDeleteProps {
  /** Does the delete; errors are the caller's to show. */
  onDelete: () => Promise<void>;
  disabled?: boolean;
}

export default function ConfirmDelete({ onDelete, disabled = false }: ConfirmDeleteProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="danger" size="sm" icon="trash" disabled={disabled} onClick={() => setAsking(true)}>
        Delete
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <Button
        variant="danger"
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onDelete();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
      >
        Yes, delete
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={() => setAsking(false)}>
        Keep
      </Button>
    </span>
  );
}
