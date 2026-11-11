"use client";

// apps/admin/components/store/FestivalsTab.tsx
//
// Festival campaigns. Festivals marked "Upcoming" or "Live" appear on the
// customer site's festival pages and in "Shop by occasion" on the homepage,
// each with the products picked here.

import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "../../lib/api";
import { cmsCreate, cmsDelete, cmsUpdate, dayEnd, dayStart, formatDay, slugify, toDateInput, useCms, type Festival, type FestivalStatus } from "../../lib/cms";
import { plural } from "../../lib/format";
import { productsFetcher, productsUrl } from "../../lib/products";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input, Select, Textarea } from "../ui/Field";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import SearchInput from "../ui/SearchInput";
import StatusPill, { type PillTone } from "../ui/StatusPill";
import ConfirmDelete from "./ConfirmDelete";

const STATUS: Record<FestivalStatus, { label: string; tone: PillTone; hint: string }> = {
  draft: { label: "Draft", tone: "grey", hint: "Not on the site" },
  upcoming: { label: "Upcoming", tone: "blue", hint: "On the site as coming soon" },
  active: { label: "Live", tone: "green", hint: "On the site as live now" },
  completed: { label: "Finished", tone: "grey", hint: "Not on the site" },
};

interface FormValues {
  name: string;
  description: string;
  bannerImage: string;
  startDate: string;
  endDate: string;
  status: FestivalStatus;
  productIds: string[];
}
const EMPTY: FormValues = { name: "", description: "", bannerImage: "", startDate: "", endDate: "", status: "draft", productIds: [] };

interface PickedProduct {
  _id: string;
  name: string;
  sku?: string;
}
const pickedFetcher = (u: string) => api.get<{ data: { products: PickedProduct[] } }>(u).then((r) => r.data.products);

/** Search the catalogue and tick the products that belong to the festival. */
function ProductPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Names of the products already picked (the festival only stores their ids).
  const { data: picked } = useSWR(selected.length ? `/api/v1/products?ids=${selected.join(",")}&limit=100` : null, pickedFetcher, { keepPreviousData: true, shouldRetryOnError: false });
  const { data: found, isLoading } = useSWR(query ? productsUrl({ status: "active", q: query, limit: 8 }) : null, productsFetcher, { shouldRetryOnError: false });

  const nameOf = (id: string) => picked?.find((p) => p._id === id)?.name || found?.products.find((p) => p._id === id)?.name || "Product";
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-semibold text-navy">Products in this festival ({selected.length})</span>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <li key={id} className="inline-flex items-center gap-1 rounded-full bg-[#E7EAF1] py-1 pl-3 pr-1 text-[13px] font-medium text-navy">
              {nameOf(id)}
              <button type="button" aria-label={`Remove ${nameOf(id)}`} onClick={() => toggle(id)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white">
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={search} onChange={setSearch} placeholder="Search active products to add" className="max-w-none" />
      {query &&
        (isLoading ? (
          <p className="text-sm text-slate">Searching…</p>
        ) : !found || found.products.length === 0 ? (
          <p className="text-sm text-slate">No active products match "{query}".</p>
        ) : (
          <ul className="flex flex-col rounded-[10px] border border-line">
            {found.products.map((p) => (
              <li key={p._id} className="border-b border-[#EEF0F3] last:border-b-0">
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-offwhite">
                  <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggle(p._id)} className="h-[18px] w-[18px] accent-navy" />
                  <span className="min-w-0 flex-1 font-medium text-navy">{p.name}</span>
                  <span className="text-xs text-slate">{p.sku}</span>
                </label>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export default function FestivalsTab() {
  const { data, error } = useCms<Festival>("festivals");
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [editing, setEditing] = useState<Festival | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  const items = data || [];
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (f: Festival) => {
    setEditing(f);
    setForm({
      name: f.name,
      description: f.description || "",
      bannerImage: f.bannerImage || "",
      startDate: toDateInput(f.startDate),
      endDate: toDateInput(f.endDate),
      status: f.status,
      productIds: (f.productIds || []).map(String),
    });
    setProblem("");
  };
  const reset = () => {
    setEditing(null);
    setForm(EMPTY);
    setProblem("");
  };

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setProblem("Enter the festival name.");
    if (!form.startDate || !form.endDate) return setProblem("Choose the start and end dates.");
    if (form.startDate > form.endDate) return setProblem("The end date must be on or after the start date.");
    if (form.bannerImage && !/^https?:\/\//.test(form.bannerImage.trim())) return setProblem("The image link must start with http:// or https://");
    setSaving(true);
    setProblem("");
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        bannerImage: form.bannerImage.trim(),
        startDate: dayStart(form.startDate),
        endDate: dayEnd(form.endDate),
        status: form.status,
        productIds: form.productIds,
      };
      // The web address (slug) is set once, when the festival is created, so links to it never break.
      if (editing) await cmsUpdate("festivals", editing._id, body);
      else await cmsCreate("festivals", { ...body, slug: slugify(form.name) });
      reset();
    } catch (err) {
      setProblem(errorMessage(err, "saving festivals"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (f: Festival) => {
    setProblem("");
    try {
      await cmsDelete("festivals", f._id);
      if (editing?._id === f._id) reset();
    } catch (err) {
      setProblem(errorMessage(err, "deleting festivals"));
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "festivals")}</Notice>;

  return (
    <div className="flex flex-col items-start gap-5 xl:flex-row">
      <div className="w-full min-w-0 xl:flex-[2]">
        <Card>
          <CardHeader title="Festival campaigns" subtitle="Upcoming and Live festivals show on the customer site" />
          {!data ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate">No festivals yet. Create the first one in the form.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((f) => {
                const status = STATUS[f.status] || STATUS.draft;
                return (
                  <li key={f._id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 ${editing?._id === f._id ? "border-navy bg-[#F4F6FB]" : "border-line"}`}>
                    <div className="min-w-0 flex-1 basis-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-navy">{f.name}</span>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </div>
                      <div className="mt-0.5 text-xs text-slate">
                        {formatDay(f.startDate)} to {formatDay(f.endDate)} · {plural((f.productIds || []).length, "product")} · {status.hint}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" icon="edit" onClick={() => startEdit(f)}>
                      Edit
                    </Button>
                    <ConfirmDelete onDelete={() => remove(f)} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <aside aria-label={editing ? "Edit festival" : "New festival"} className="w-full min-w-0 xl:flex-1 xl:basis-[400px]">
        <Card className="p-[22px]">
          <CardHeader title={editing ? `Edit ${editing.name}` : "New festival"} subtitle={editing ? `Page address: /festival/${editing.slug}` : undefined} />
          <form onSubmit={save} className="flex flex-col gap-3.5">
            {problem && <Notice tone="error">{problem}</Notice>}
            <Field id="f-name" label="Festival name">
              <Input id="f-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kartik Purnima" />
            </Field>
            <Field id="f-desc" label="Description (optional)" helper="Shown at the top of the festival page">
              <Textarea id="f-desc" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field id="f-start" label="Starts">
                <Input id="f-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field id="f-end" label="Ends">
                <Input id="f-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
            </div>
            <Field id="f-status" label="Status" helper={STATUS[form.status].hint}>
              <Select id="f-status" value={form.status} onChange={(e) => set("status", e.target.value as FestivalStatus)}>
                {(Object.keys(STATUS) as FestivalStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="f-image" label="Banner image link (optional)" helper="Paste the web address of an image already uploaded">
              <Input id="f-image" value={form.bannerImage} onChange={(e) => set("bannerImage", e.target.value)} placeholder="https://…" />
            </Field>
            <ProductPicker selected={form.productIds} onChange={(ids) => set("productIds", ids)} />
            <div className="flex gap-2">
              <Button type="submit" loading={saving} fullWidth>
                {editing ? "Save changes" : "Create festival"}
              </Button>
              {editing && (
                <Button variant="ghost" disabled={saving} onClick={reset}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>
      </aside>
    </div>
  );
}
