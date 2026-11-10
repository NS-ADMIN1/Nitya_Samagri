"use client";

// components/checkout/AddressStep.jsx
// Pick a saved address (GET /addresses) or add a new one.

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/auth";
import AddressForm from "./AddressForm";

// Backend address document → the shape checkout uses.
export function normalizeAddress(a) {
  return {
    id: a._id,
    label: a.label || "",
    name: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 || "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: !!a.isDefault,
  };
}

export function formatAddress(a) {
  return [a.line1, a.line2, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(", ");
}

export default function AddressStep({ selected, onSelect }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/addresses")
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) {
          setError(body?.message || "Couldn't load your saved addresses.");
          return;
        }
        const list = (body?.data?.addresses || []).map(normalizeAddress);
        setAddresses(list);
        if (list.length === 0) setShowForm(true);
        else if (!selected) onSelect(list.find((a) => a.isDefault) || list[0]);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Load once when the step opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaved = (apiAddress) => {
    const saved = normalizeAddress(apiAddress);
    setAddresses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
    onSelect(saved);
    setShowForm(false);
  };

  if (loading) {
    return <p className="text-sm text-slate">Loading your addresses…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {addresses.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Choose a delivery address</legend>
          {addresses.map((a) => {
            const checked = selected?.id === a.id;
            return (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded p-4 ${
                  checked ? "border-2 border-navy" : "border border-field hover:border-navy"
                }`}
              >
                <input
                  type="radio"
                  name="delivery-address"
                  checked={checked}
                  onChange={() => onSelect(a)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-navy"
                />
                <span className="flex flex-col gap-0.5 text-sm">
                  <span className="font-semibold">
                    {a.name}
                    {a.isDefault && <span className="ml-2 font-medium text-gold-ink">Default</span>}
                  </span>
                  <span className="text-slate">{formatAddress(a)}</span>
                  <span className="text-slate">{a.phone}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {showForm ? (
        <div className="flex flex-col gap-4 rounded border border-line p-4 md:p-5">
          <h3 className="text-base font-semibold">{addresses.length > 0 ? "Add a new address" : "Add a delivery address"}</h3>
          <AddressForm onSaved={handleSaved} onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined} />
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} className="btn btn-outline self-start">
          Add a new address
        </button>
      )}
    </div>
  );
}
