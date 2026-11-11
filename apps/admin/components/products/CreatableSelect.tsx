"use client";

// apps/admin/components/products/CreatableSelect.tsx
//
// A dropdown with a "New" button beside it, for picking a category or brand
// and adding a missing one without leaving the product form.

import { useState } from "react";
import type { NamedRef } from "../../lib/products";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Field";

interface CreatableSelectProps {
  id: string;
  /** "category" or "brand" — used in the wording. */
  noun: string;
  value: string;
  onChange: (id: string) => void;
  items: NamedRef[];
  /** Creates the item on the server and returns it. */
  onCreate: (name: string) => Promise<NamedRef>;
  /** Shown as the first, empty option. */
  placeholder: string;
}

export default function CreatableSelect({ id, noun, value, onChange, items, onCreate, placeholder }: CreatableSelectProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await onCreate(name.trim());
      onChange(created._id);
      setName("");
      setAdding(false);
    } catch (e) {
      setError((e as { message?: string })?.message || `Could not add this ${noun}`);
    } finally {
      setSaving(false);
    }
  };

  if (!adding) {
    return (
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{placeholder}</option>
            {items.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" icon="plus" onClick={() => setAdding(true)}>
          New
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${noun} name`} autoFocus />
        </div>
        <Button onClick={add} loading={saving}>
          Add
        </Button>
        <Button variant="ghost" onClick={() => setAdding(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
      {error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
