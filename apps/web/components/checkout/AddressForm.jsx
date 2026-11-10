"use client";

// components/checkout/AddressForm.jsx
// New delivery address → POST /addresses. Field rules match the backend's
// AddressSchema (backend/src/modules/addresses/address.routes.ts).

import { useState } from "react";
import { apiFetch, toE164Phone } from "../../lib/auth";

const EMPTY = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

function validate(values) {
  const errors = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Enter the full name.";
  if (!toE164Phone(values.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
  if (values.line1.trim().length < 3) errors.line1 = "Enter the house number, street and area.";
  if (!/^\d{6}$/.test(values.pincode)) errors.pincode = "Enter a 6-digit pincode.";
  if (values.city.trim().length < 2) errors.city = "Enter the city.";
  if (values.state.trim().length < 2) errors.state = "Enter the state.";
  return errors;
}

function Field({ id, label, error, className = "", ...inputProps }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`input ${error ? "border-danger" : ""}`}
        {...inputProps}
      />
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddressForm({ onSaved, onCancel }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setSaveError("");
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const { ok, body } = await apiFetch("/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: "Home",
          fullName: values.fullName.trim(),
          phone: toE164Phone(values.phone),
          line1: values.line1.trim(),
          line2: values.line2.trim() || undefined,
          city: values.city.trim(),
          state: values.state.trim(),
          pincode: values.pincode,
        }),
      });
      if (!ok) throw new Error(body?.message || "Couldn't save this address.");
      setValues(EMPTY);
      onSaved(body.data.address);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="addr-name" label="Full name" autoComplete="name" value={values.fullName} onChange={set("fullName")} error={errors.fullName} />
        <Field
          id="addr-phone"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set("phone")}
          error={errors.phone}
        />
        <Field
          id="addr-line1"
          label="Address (house no., street, area)"
          autoComplete="address-line1"
          className="sm:col-span-2"
          value={values.line1}
          onChange={set("line1")}
          error={errors.line1}
        />
        <Field
          id="addr-line2"
          label="Landmark (optional)"
          autoComplete="address-line2"
          className="sm:col-span-2"
          value={values.line2}
          onChange={set("line2")}
        />
        <Field
          id="addr-pincode"
          label="Pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={values.pincode}
          onChange={(e) => setValues((v) => ({ ...v, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
          error={errors.pincode}
        />
        <Field id="addr-city" label="City" autoComplete="address-level2" value={values.city} onChange={set("city")} error={errors.city} />
        <Field id="addr-state" label="State" autoComplete="address-level1" value={values.state} onChange={set("state")} error={errors.state} />
      </div>

      {saveError && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="btn btn-navy">
          {saving ? "Saving…" : "Save address"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="btn btn-outline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
