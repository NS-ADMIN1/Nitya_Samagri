"use client";

// apps/admin/components/products/ProductForm.tsx
//
// The add / edit product form: three numbered steps on the left, visibility
// and a "before you publish" checklist on the right. Used by
// app/products/new (add) and app/products (edit).

import { useState } from "react";
import {
  archiveProduct,
  createBrand,
  createCategory,
  createProduct,
  EMPTY_PRODUCT,
  slugify,
  toFormValues,
  updateProduct,
  useBrands,
  useCategories,
  validateProduct,
  type Product,
  type ProductFormValues,
  type ProductStatus,
} from "../../lib/products";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input, Textarea } from "../ui/Field";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import Toggle from "../ui/Toggle";
import CreatableSelect from "./CreatableSelect";

interface ProductFormProps {
  /** The product being edited; leave out to add a new one. */
  product?: Product;
  /** Archive is offered only to roles the API allows (super admin). */
  canArchive?: boolean;
  /** Called after a successful save or archive. */
  onDone: () => void;
  onCancel: () => void;
}

function CheckItem({ done, children }: { done: boolean; children: string }) {
  return (
    <li className={`flex items-center gap-2.5 py-1 text-sm ${done ? "text-navy" : "text-slate"}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${done ? "bg-success" : "bg-[#D9DDE5]"}`}>
        {done && <Icon name="check" size={12} strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}

export default function ProductForm({ product, canArchive = false, onDone, onCancel }: ProductFormProps) {
  const editing = !!product;
  const [values, setValues] = useState<ProductFormValues>(product ? toFormValues(product) : EMPTY_PRODUCT);
  const [autoSlug, setAutoSlug] = useState(!editing);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState<null | ProductStatus | "archive">(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();

  const errors = validateProduct(values);
  const shown = showErrors ? errors : {};
  const valid = Object.keys(errors).length === 0;

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (key === "name" && autoSlug) next.slug = slugify(String(value));
      return next;
    });
  };
  const onText = (key: keyof ProductFormValues) => (e: { target: { value: string } }) => set(key, e.target.value as never);

  const save = async (status: ProductStatus) => {
    setShowErrors(true);
    setSaveError("");
    if (!valid) {
      setSaveError("Some details are missing or need fixing. They are marked below.");
      return;
    }
    setSaving(status);
    try {
      if (product) await updateProduct(product._id, values, status);
      else await createProduct(values, status);
      onDone();
    } catch (e) {
      setSaveError(errorMessage(e, "saving this product"));
    } finally {
      setSaving(null);
    }
  };

  const archive = async () => {
    if (!product) return;
    setSaving("archive");
    setSaveError("");
    try {
      await archiveProduct(product._id);
      onDone();
    } catch (e) {
      setSaveError(errorMessage(e, "archiving products"));
    } finally {
      setSaving(null);
    }
  };

  const busy = saving !== null;
  const live = product?.status === "active";

  return (
    <div className="flex flex-col gap-5">
      {saveError && <Notice tone="error">{saveError}</Notice>}

      <div className="flex flex-col items-start gap-5 xl:flex-row">
        {/* ── Left: the three steps ─────────────────────────────────────── */}
        <div className="flex w-full min-w-0 flex-col gap-5 xl:flex-[2]">
          <Card className="p-[22px]">
            <CardHeader title="1 · Basics" subtitle="What customers see first" />
            <div className="flex flex-col gap-4">
              <Field id="p-name" label="Product name" helper="Keep it short: item, variant, size" error={shown.name}>
                <Input id="p-name" value={values.name} onChange={onText("name")} placeholder="e.g. Sandal agarbatti, 120 sticks" invalid={!!shown.name} />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field id="p-category" label="Category" error={shown.categoryId} helper={categories && categories.length === 0 ? "No categories yet — press New to add the first one" : undefined}>
                  <CreatableSelect
                    id="p-category"
                    noun="category"
                    value={values.categoryId}
                    onChange={(id) => set("categoryId", id)}
                    items={categories || []}
                    onCreate={createCategory}
                    placeholder="Select category"
                  />
                </Field>
                <Field id="p-brand" label="Brand (optional)">
                  <CreatableSelect
                    id="p-brand"
                    noun="brand"
                    value={values.brandId}
                    onChange={(id) => set("brandId", id)}
                    items={brands || []}
                    onCreate={createBrand}
                    placeholder="No brand"
                  />
                </Field>
              </div>
              <Field id="p-short" label="Short description" helper={`Shown on product cards · ${values.shortDesc.length}/300`} error={shown.shortDesc}>
                <Input id="p-short" value={values.shortDesc} onChange={onText("shortDesc")} placeholder="One line about the product" invalid={!!shown.shortDesc} />
              </Field>
              <Field id="p-desc" label="Full description (optional)" helper="Shown on the product page">
                <Textarea id="p-desc" rows={4} value={values.description} onChange={onText("description")} />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field id="p-tags" label="Search tags (optional)" helper="Separate with commas">
                  <Input id="p-tags" value={values.tags} onChange={onText("tags")} placeholder="agarbatti, sandal, daily pooja" />
                </Field>
                <Field id="p-slug" label="Web address" helper="Filled in from the name; change only if needed" error={shown.slug}>
                  <Input
                    id="p-slug"
                    value={values.slug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      set("slug", e.target.value);
                    }}
                    placeholder="sandal-agarbatti-120-sticks"
                    invalid={!!shown.slug}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-[22px]">
            <CardHeader title="2 · Price & tax" subtitle="Amounts in rupees" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="p-price" label="Selling price" error={shown.price}>
                <Input id="p-price" type="number" inputMode="decimal" min="0" prefix="₹" value={values.price} onChange={onText("price")} invalid={!!shown.price} />
              </Field>
              <Field id="p-mrp" label="MRP" helper="Shown struck through when higher" error={shown.mrp}>
                <Input id="p-mrp" type="number" inputMode="decimal" min="0" prefix="₹" value={values.mrp} onChange={onText("mrp")} invalid={!!shown.mrp} />
              </Field>
              <Field id="p-cost" label="Cost price (optional)" helper="Only staff see this" error={shown.costPrice}>
                <Input id="p-cost" type="number" inputMode="decimal" min="0" prefix="₹" value={values.costPrice} onChange={onText("costPrice")} invalid={!!shown.costPrice} />
              </Field>
              <Field id="p-gst" label="GST rate" error={shown.gstPct}>
                <Input id="p-gst" type="number" inputMode="decimal" min="0" max="28" prefix="%" value={values.gstPct} onChange={onText("gstPct")} invalid={!!shown.gstPct} />
              </Field>
              <Field id="p-hsn" label="HSN code (optional)">
                <Input id="p-hsn" value={values.hsnCode} onChange={onText("hsnCode")} placeholder="e.g. 3307" />
              </Field>
            </div>
          </Card>

          <Card className="p-[22px]">
            <CardHeader title="3 · Stock" subtitle="Used for low-stock alerts" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="p-sku" label="SKU" helper="Your own product code" error={shown.sku}>
                <Input id="p-sku" value={values.sku} onChange={onText("sku")} placeholder="e.g. AGB-SND-120" invalid={!!shown.sku} />
              </Field>
              <Field id="p-stock" label={editing ? "In stock now" : "Opening stock"} helper={editing ? "Change stock from the Inventory page" : undefined} error={shown.stock}>
                <Input id="p-stock" type="number" inputMode="numeric" min="0" value={values.stock} onChange={onText("stock")} disabled={editing} invalid={!!shown.stock} />
              </Field>
              <Field id="p-low" label="Alert me at or below" helper="Reorder level" error={shown.lowStockAt}>
                <Input id="p-low" type="number" inputMode="numeric" min="0" value={values.lowStockAt} onChange={onText("lowStockAt")} invalid={!!shown.lowStockAt} />
              </Field>
              <Field id="p-weight" label="Weight in grams (optional)" error={shown.weight}>
                <Input id="p-weight" type="number" inputMode="decimal" min="0" value={values.weight} onChange={onText("weight")} invalid={!!shown.weight} />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── Right: visibility + checklist ─────────────────────────────── */}
        <div className="flex w-full min-w-0 flex-col gap-5 xl:flex-1">
          <Card className="p-[22px]">
            <CardHeader title="Visibility" subtitle={editing ? (live ? "This product is live on the store" : product?.status === "archived" ? "This product is archived" : "This product is a draft") : "Draft until you publish"} />
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-navy">Featured product</div>
                <div className="text-xs text-slate">Show it in the featured section on the homepage</div>
              </div>
              <Toggle checked={values.isFeatured} onChange={(next) => set("isFeatured", next)} label="Featured product" />
            </div>
          </Card>

          <Card className="p-[18px]">
            <h2 className="mb-2 font-sans text-[13px] font-semibold text-navy">Before you publish</h2>
            <ul>
              <CheckItem done={!errors.name && !errors.categoryId}>Name and category</CheckItem>
              <CheckItem done={!errors.price && !errors.mrp && !errors.gstPct}>Price and GST</CheckItem>
              <CheckItem done={!errors.sku && !errors.stock && !errors.lowStockAt}>SKU and stock</CheckItem>
            </ul>
          </Card>

          {editing && canArchive && product?.status !== "archived" && (
            <Card className="p-[18px]">
              {confirmArchive ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-navy">Archive this product? It is removed from the store but kept in your records, and can be restored later.</p>
                  <div className="flex gap-2">
                    <Button variant="danger" loading={saving === "archive"} disabled={busy} onClick={archive} fullWidth>
                      Yes, archive
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => setConfirmArchive(false)}>
                      Keep
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="danger" icon="trash" disabled={busy} onClick={() => setConfirmArchive(true)} fullWidth>
                  Archive product
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-offwhite/95 px-4 py-3.5 sm:-mx-8 sm:px-8">
        <Button variant="quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="ghost" loading={saving === "draft"} disabled={busy} onClick={() => save("draft")}>
          {live ? "Save and hide from store" : "Save as draft"}
        </Button>
        <Button icon="check" loading={saving === "active"} disabled={busy} onClick={() => save("active")}>
          {live ? "Save changes" : "Save and publish"}
        </Button>
      </div>
    </div>
  );
}
