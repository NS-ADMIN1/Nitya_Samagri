"use client";

// components/account/AddressesPanel.jsx
// The customer's real saved addresses: GET, POST, PATCH (make default) and
// DELETE on /addresses.

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/auth";
import AddressForm from "../checkout/AddressForm";
import { formatAddress, normalizeAddress } from "../checkout/AddressStep";

export default function AddressesPanel() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = async () => {
    try {
      const { ok, body } = await apiFetch("/addresses");
      if (!ok) throw new Error(body?.message || "Couldn't load your addresses.");
      setAddresses((body?.data?.addresses || []).map(normalizeAddress));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const makeDefault = async (id) => {
    setBusyId(id);
    setError("");
    const { ok, body } = await apiFetch(`/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isDefault: true }),
    }).catch(() => ({ ok: false, body: { message: "Couldn't reach the server. Please try again." } }));
    if (!ok) setError(body?.message || "Couldn't update this address.");
    await load();
    setBusyId(null);
  };

  const remove = async (id) => {
    setBusyId(id);
    setError("");
    const { ok, body } = await apiFetch(`/addresses/${id}`, { method: "DELETE" }).catch(() => ({
      ok: false,
      body: { message: "Couldn't reach the server. Please try again." },
    }));
    if (!ok) setError(body?.message || "Couldn't delete this address.");
    setConfirmDeleteId(null);
    await load(); // the backend may promote another address to default
    setBusyId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="heading-display text-2xl">Saved Addresses</h2>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-navy min-h-[44px] px-4">
            Add address
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {showForm && (
        <div className="flex flex-col gap-4 rounded-md border border-line p-4 md:p-5">
          <h3 className="text-base font-semibold">New address</h3>
          <AddressForm
            onSaved={() => {
              setShowForm(false);
              load();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate">Loading your addresses…</p>
      ) : addresses.length === 0 ? (
        !showForm && <p className="text-slate">You have no saved addresses yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className={`flex flex-col gap-3 rounded-md p-4 ${a.isDefault ? "border-2 border-navy" : "border border-line"}`}>
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">{a.name}</span>
                {a.isDefault && <span className="ml-2 font-medium text-gold-ink">Default</span>}
                <br />
                <span className="text-slate">{formatAddress(a)}</span>
                <br />
                <span className="text-slate">{a.phone}</span>
              </p>

              {confirmDeleteId === a.id ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-semibold">Delete this address?</span>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => remove(a.id)}
                    className="btn min-h-[40px] bg-danger px-3 text-white"
                  >
                    {busyId === a.id ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => setConfirmDeleteId(null)}
                    className="btn btn-outline min-h-[40px] px-3"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-semibold">
                  {!a.isDefault && (
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => makeDefault(a.id)}
                      className="min-h-[36px] underline"
                    >
                      {busyId === a.id ? "Saving…" : "Make default"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => setConfirmDeleteId(a.id)}
                    className="min-h-[36px] text-slate underline hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
