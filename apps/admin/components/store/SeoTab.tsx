"use client";

// apps/admin/components/store/SeoTab.tsx — the search-result title and description saved for each page.

import { useState } from "react";
import { cmsUpdate, useCms, type SeoPage } from "../../lib/cms";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input, Textarea } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import NotOnSiteNotice from "./NotOnSiteNotice";

// Lengths search engines usually show in full.
const TITLE_MAX = 60;
const DESC_MAX = 160;

export default function SeoTab() {
  const { data, error } = useCms<SeoPage>("seo-pages");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", desc: "" });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  const items = data || [];

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!editingId) return;
    if (!form.title.trim()) return setProblem("Enter the page title.");
    setSaving(true);
    setProblem("");
    try {
      await cmsUpdate("seo-pages", editingId, { title: form.title.trim(), desc: form.desc.trim() });
      setEditingId(null);
    } catch (err) {
      setProblem(errorMessage(err, "saving page details"));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "page details")}</Notice>;

  return (
    <div className="flex flex-col gap-5">
      <NotOnSiteNotice what="these page titles and descriptions" />
      <Card>
        <CardHeader title="Search titles and descriptions" subtitle="What should show for each page in Google results" />
        {!data ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate">No pages have been set up for SEO yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((p) =>
              editingId === p._id ? (
                <li key={p._id} className="rounded-xl border border-navy bg-[#F4F6FB] p-3.5">
                  <form onSubmit={save} className="flex flex-col gap-3.5">
                    <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{p.page}</div>
                    {problem && <Notice tone="error">{problem}</Notice>}
                    <Field id="seo-title" label="Page title" helper={`${form.title.length}/${TITLE_MAX} characters`}>
                      <Input id="seo-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    </Field>
                    <Field id="seo-desc" label="Description" helper={`${form.desc.length}/${DESC_MAX} characters`}>
                      <Textarea id="seo-desc" value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="submit" loading={saving}>
                        Save
                      </Button>
                      <Button variant="ghost" disabled={saving} onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={p._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <div className="min-w-0 flex-1 basis-[260px]">
                    <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{p.page}</div>
                    <div className="text-sm font-semibold text-navy">{p.title}</div>
                    <div className="mt-0.5 text-[13px] text-slate">{p.desc || "No description yet"}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    onClick={() => {
                      setEditingId(p._id);
                      setForm({ title: p.title, desc: p.desc || "" });
                      setProblem("");
                    }}
                  >
                    Edit
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
