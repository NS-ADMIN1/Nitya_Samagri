"use client";

// apps/admin/components/coupons/CouponForm.tsx
//
// Create or edit a coupon. Sits beside the coupon list. Shows, as you type,
// the sentence the customer will see and what they save on a sample order.

import { useEffect, useState } from "react";
import {
  createCoupon,
  deleteCoupon,
  discountFor,
  EMPTY_COUPON,
  offerText,
  randomCode,
  toCouponForm,
  updateCoupon,
  validateCoupon,
  type Coupon,
  type CouponFormValues,
  type CouponType,
} from "../../lib/coupons";
import { formatINR } from "../../lib/format";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import Tabs from "../ui/Tabs";
import Toggle from "../ui/Toggle";

interface CouponFormProps {
  /** The coupon being edited; leave out to create a new one. */
  coupon?: Coupon | null;
  /** Called after a save or delete, and when editing is cancelled. */
  onDone: () => void;
}

const TYPES: { id: CouponType; label: string }[] = [
  { id: "percent", label: "Percent off" },
  { id: "flat", label: "Flat amount" },
];

export default function CouponForm({ coupon, onDone }: CouponFormProps) {
  const [values, setValues] = useState<CouponFormValues>(EMPTY_COUPON);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sampleOrder, setSampleOrder] = useState("500");

  // Load the coupon when one is picked for editing; clear when going back to "create".
  useEffect(() => {
    setValues(coupon ? toCouponForm(coupon) : EMPTY_COUPON);
    setShowErrors(false);
    setSaveError("");
    setConfirmDelete(false);
  }, [coupon]);

  const errors = validateCoupon(values);
  const shown = showErrors ? errors : {};
  const set = <K extends keyof CouponFormValues>(key: K, value: CouponFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const onText = (key: keyof CouponFormValues) => (e: { target: { value: string } }) => set(key, e.target.value as never);

  // What the numbers typed so far mean for a customer.
  const draft = {
    type: values.type,
    value: Number(values.value) || 0,
    maxDiscount: values.type === "percent" && Number(values.maxDiscount) > 0 ? Number(values.maxDiscount) : undefined,
    minOrderValue: Number(values.minOrderValue) || 0,
  };
  const order = Number(sampleOrder) || 0;
  const saved = discountFor(draft, order);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setShowErrors(true);
    setSaveError("");
    if (Object.keys(errors).length > 0) {
      setSaveError("Some details are missing or need fixing. They are marked below.");
      return;
    }
    setSaving(true);
    try {
      if (coupon) await updateCoupon(coupon._id, values);
      else await createCoupon(values);
      setValues(EMPTY_COUPON);
      setShowErrors(false);
      onDone();
    } catch (err) {
      setSaveError(errorMessage(err, "saving coupons"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!coupon) return;
    setDeleting(true);
    setSaveError("");
    try {
      await deleteCoupon(coupon._id);
      onDone();
    } catch (err) {
      setSaveError(errorMessage(err, "deleting coupons"));
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <Card className="p-[22px]">
      <CardHeader title={coupon ? `Edit ${coupon.code}` : "Create coupon"} subtitle={coupon ? `Used ${coupon.usedCount} times so far` : "Takes under a minute"} />
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {saveError && <Notice tone="error">{saveError}</Notice>}

        <Field id="c-code" label="Coupon code" helper="Capital letters and numbers only" error={shown.code}>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input id="c-code" value={values.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))} placeholder="e.g. POOJA50" invalid={!!shown.code} />
            </div>
            <Button variant="ghost" onClick={() => set("code", randomCode())} disabled={busy}>
              Generate
            </Button>
          </div>
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy">Discount type</span>
          <Tabs label="Discount type" items={TYPES} value={values.type} onChange={(type) => set("type", type)} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field id="c-value" label={values.type === "percent" ? "Percent off" : "Amount off"} error={shown.value}>
            <Input id="c-value" type="number" inputMode="decimal" min="0" prefix={values.type === "percent" ? "%" : "₹"} value={values.value} onChange={onText("value")} placeholder={values.type === "percent" ? "10" : "50"} invalid={!!shown.value} />
          </Field>
          {values.type === "percent" && (
            <Field id="c-max" label="Maximum discount" helper="Empty = no cap" error={shown.maxDiscount}>
              <Input id="c-max" type="number" inputMode="decimal" min="0" prefix="₹" value={values.maxDiscount} onChange={onText("maxDiscount")} placeholder="100" invalid={!!shown.maxDiscount} />
            </Field>
          )}
          <Field id="c-min" label="Minimum order" helper="Empty = any order" error={shown.minOrderValue}>
            <Input id="c-min" type="number" inputMode="decimal" min="0" prefix="₹" value={values.minOrderValue} onChange={onText("minOrderValue")} placeholder="299" invalid={!!shown.minOrderValue} />
          </Field>
          <Field id="c-limit" label="Total uses allowed" helper="Empty = unlimited" error={shown.usageLimit}>
            <Input id="c-limit" type="number" inputMode="numeric" min="1" value={values.usageLimit} onChange={onText("usageLimit")} placeholder="Unlimited" invalid={!!shown.usageLimit} />
          </Field>
          <Field id="c-start" label="Starts" helper="Empty = straight away">
            <Input id="c-start" type="date" value={values.startsAt} onChange={onText("startsAt")} />
          </Field>
          <Field id="c-end" label="Ends" helper="Empty = no end date" error={shown.expiresAt}>
            <Input id="c-end" type="date" value={values.expiresAt} onChange={onText("expiresAt")} invalid={!!shown.expiresAt} />
          </Field>
        </div>

        <Field id="c-desc" label="Description (optional)" helper="A short line shown to customers" error={shown.desc}>
          <Input id="c-desc" value={values.desc} onChange={onText("desc")} placeholder="e.g. Welcome offer on your first order" invalid={!!shown.desc} />
        </Field>

        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-navy">Coupon is on</div>
            <div className="text-xs text-slate">Switch off to pause it without deleting</div>
          </div>
          <Toggle checked={values.isActive} onChange={(next) => set("isActive", next)} label="Coupon is on" />
        </div>

        {draft.value > 0 && (
          <div className="rounded-[10px] bg-[#FBF1D3] px-3.5 py-3 text-[13px] leading-relaxed text-[#6B4F08]">
            <div>
              <strong>Customer will see:</strong> {offerText(draft)}
              {draft.minOrderValue > 0 ? ` on orders above ${formatINR(draft.minOrderValue)}` : ""}
            </div>
            <label className="mt-2 flex flex-wrap items-center gap-2">
              <span>On an order of ₹</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={sampleOrder}
                onChange={(e) => setSampleOrder(e.target.value)}
                aria-label="Sample order amount in rupees"
                className="h-9 w-[92px] rounded-lg border border-[#D9C078] bg-white px-2 text-sm font-semibold text-navy outline-none focus:border-navy"
              />
              <span>
                {order < draft.minOrderValue ? "the minimum order is not met" : (
                  <>
                    they save <strong>{formatINR(saved)}</strong> and pay <strong>{formatINR(Math.max(0, order - saved))}</strong>
                  </>
                )}
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={saving} disabled={busy} fullWidth>
            {coupon ? "Save changes" : "Create coupon"}
          </Button>
          {coupon && (
            <Button variant="ghost" disabled={busy} onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>

        {coupon &&
          (confirmDelete ? (
            <div className="flex flex-col gap-3 rounded-xl border border-danger-line bg-danger-soft p-3.5">
              <p className="text-sm text-navy">Delete {coupon.code} for good? Customers will no longer be able to use it. To stop it for a while, switch it off instead.</p>
              <div className="flex gap-2">
                <Button variant="danger" loading={deleting} disabled={busy} onClick={remove} fullWidth>
                  Yes, delete
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" icon="trash" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete coupon
            </Button>
          ))}
      </form>
    </Card>
  );
}
