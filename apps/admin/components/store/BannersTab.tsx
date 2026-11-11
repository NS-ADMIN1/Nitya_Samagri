"use client";

// apps/admin/components/store/BannersTab.tsx — homepage banners: add, edit, switch on/off, delete.

import { useState } from "react";
import { cmsCreate, cmsDelete, cmsUpdate, useCms, type Banner } from "../../lib/cms";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import StatusPill from "../ui/StatusPill";
import Toggle from "../ui/Toggle";
import ConfirmDelete from "./ConfirmDelete";
import NotOnSiteNotice from "./NotOnSiteNotice";

const EMPTY = { title: "", cta: "Shop now", url: "", imageUrl: "" };

export default function BannersTab() {
  const { data, error } = useCms<Banner>("banners");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");

  const items = data || [];
  const onText = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
    setProblem("");
  };

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.title.trim()) return setProblem("Enter the banner title.");
    setSaving(true);
    setProblem("");
    try {
      const body = { title: form.title.trim(), cta: form.cta.trim(), url: form.url.trim(), imageUrl: form.imageUrl.trim() };
      if (editingId) await cmsUpdate("banners", editingId, body);
      else await cmsCreate("banners", { ...body, status: "draft" });
      reset();
    } catch (err) {
      setProblem(errorMessage(err, "saving banners"));
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, run: () => Promise<void>) => {
    setBusyId(id);
    setProblem("");
    try {
      await run();
      if (editingId === id) reset();
    } catch (err) {
      setProblem(errorMessage(err, "changing banners"));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "banners")}</Notice>;

  return (
    <div className="flex flex-col gap-5">
      <NotOnSiteNotice what="banners" />
      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 xl:flex-[2]">
          <Card>
            <CardHeader title="Banners" subtitle={data ? `${items.filter((b) => b.status === "active").length} switched on` : undefined} />
            {!data ? (
              <p className="text-sm text-slate">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate">No banners yet. Add the first one in the form.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((b) => (
                  <li key={b._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                    <div className="min-w-0 flex-1 basis-[220px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-navy">{b.title}</span>
                        <StatusPill tone={b.status === "active" ? "green" : "grey"}>{b.status === "active" ? "On" : b.status === "expired" ? "Expired" : "Draft"}</StatusPill>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate">
                        {b.cta ? `Button: ${b.cta}` : "No button"} · {b.url ? `Opens ${b.url}` : "No link"}
                      </div>
                    </div>
                    <Toggle checked={b.status === "active"} disabled={busyId === b._id} label={`Switch ${b.title} on`} onChange={(next) => act(b._id, () => cmsUpdate("banners", b._id, { status: next ? "active" : "draft" }))} />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="edit"
                      onClick={() => {
                        setEditingId(b._id);
                        setForm({ title: b.title, cta: b.cta || "", url: b.url || "", imageUrl: b.imageUrl || "" });
                        setProblem("");
                      }}
                    >
                      Edit
                    </Button>
                    <ConfirmDelete disabled={busyId === b._id} onDelete={() => act(b._id, () => cmsDelete("banners", b._id))} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside aria-label={editingId ? "Edit banner" : "New banner"} className="w-full min-w-0 xl:flex-1 xl:basis-[360px]">
          <Card className="p-[22px]">
            <CardHeader title={editingId ? "Edit banner" : "New banner"} subtitle={editingId ? undefined : "Saved as a draft; switch it on from the list"} />
            <form onSubmit={save} className="flex flex-col gap-3.5">
              {problem && <Notice tone="error">{problem}</Notice>}
              <Field id="b-title" label="Title">
                <Input id="b-title" value={form.title} onChange={onText("title")} placeholder="e.g. Daily pooja essentials" />
              </Field>
              <Field id="b-cta" label="Button text">
                <Input id="b-cta" value={form.cta} onChange={onText("cta")} placeholder="Shop now" />
              </Field>
              <Field id="b-url" label="Button opens" helper="A page on the store, e.g. /shop">
                <Input id="b-url" value={form.url} onChange={onText("url")} placeholder="/shop" />
              </Field>
              <Field id="b-image" label="Image link (optional)" helper="Web address of an image already uploaded">
                <Input id="b-image" value={form.imageUrl} onChange={onText("imageUrl")} placeholder="https://…" />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={saving} fullWidth>
                  {editingId ? "Save changes" : "Add banner"}
                </Button>
                {editingId && (
                  <Button variant="ghost" disabled={saving} onClick={reset}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}
