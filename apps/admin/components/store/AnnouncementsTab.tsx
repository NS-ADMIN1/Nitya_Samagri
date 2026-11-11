"use client";

// apps/admin/components/store/AnnouncementsTab.tsx
//
// The thin strip above the customer site's header. The site shows ONE
// announcement: the newest one that is switched on and inside its dates.

import { useState } from "react";
import { cmsCreate, cmsDelete, cmsUpdate, dayEnd, dayStart, formatDay, isAnnouncementLive, toDateInput, useCms, type Announcement } from "../../lib/cms";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import StatusPill from "../ui/StatusPill";
import Toggle from "../ui/Toggle";
import ConfirmDelete from "./ConfirmDelete";

const EMPTY = { text: "", startDate: "", endDate: "" };
const MAX = 80;

export default function AnnouncementsTab() {
  const { data, error } = useCms<Announcement>("announcements");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");

  const items = data || [];
  const live = items.find((a) => isAnnouncementLive(a));

  const startEdit = (a: Announcement) => {
    setEditingId(a._id);
    setForm({ text: a.text, startDate: toDateInput(a.startDate), endDate: toDateInput(a.endDate) });
    setProblem("");
  };
  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
    setProblem("");
  };

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.text.trim()) return setProblem("Type the message customers should see.");
    if (form.startDate && form.endDate && form.startDate > form.endDate) return setProblem("The end date must be on or after the start date.");
    setSaving(true);
    setProblem("");
    try {
      const body = {
        text: form.text.trim(),
        ...(form.startDate ? { startDate: dayStart(form.startDate) } : {}),
        ...(form.endDate ? { endDate: dayEnd(form.endDate) } : {}),
      };
      if (editingId) await cmsUpdate("announcements", editingId, body);
      else await cmsCreate("announcements", { ...body, active: true });
      reset();
    } catch (err) {
      setProblem(errorMessage(err, "saving announcements"));
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
      setProblem(errorMessage(err, "changing announcements"));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "announcements")}</Notice>;

  return (
    <div className="flex flex-col items-start gap-5 xl:flex-row">
      <div className="flex w-full min-w-0 flex-col gap-5 xl:flex-[2]">
        <Card>
          <CardHeader title="On the site right now" subtitle="The strip above the header on every page" />
          {live ? (
            <div className="rounded-lg bg-navy px-3.5 py-2.5 text-center text-[13px] text-white">{live.text}</div>
          ) : (
            <p className="text-sm text-slate">No announcement is live, so the strip is hidden.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="All announcements" subtitle="Only one shows at a time: the newest that is on and inside its dates" />
          {!data ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate">No announcements yet. Write the first one in the form.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((a) => (
                <li key={a._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <div className="min-w-0 flex-1 basis-[240px]">
                    <div className="text-sm font-semibold text-navy">{a.text}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
                      {live?._id === a._id ? <StatusPill tone="green">Live</StatusPill> : !a.active ? <StatusPill tone="grey">Off</StatusPill> : <StatusPill tone="blue">Waiting</StatusPill>}
                      <span>
                        {a.startDate ? `From ${formatDay(a.startDate)}` : "No start date"} · {a.endDate ? `till ${formatDay(a.endDate)}` : "no end date"}
                      </span>
                    </div>
                  </div>
                  <Toggle checked={a.active} disabled={busyId === a._id} label={`Show "${a.text}" on the site`} onChange={(next) => act(a._id, () => cmsUpdate("announcements", a._id, { active: next }))} />
                  <Button variant="ghost" size="sm" icon="edit" onClick={() => startEdit(a)}>
                    Edit
                  </Button>
                  <ConfirmDelete disabled={busyId === a._id} onDelete={() => act(a._id, () => cmsDelete("announcements", a._id))} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside aria-label={editingId ? "Edit announcement" : "New announcement"} className="w-full min-w-0 xl:sticky xl:top-5 xl:flex-1 xl:basis-[360px]">
        <Card className="p-[22px]">
          <CardHeader title={editingId ? "Edit announcement" : "New announcement"} />
          <form onSubmit={save} className="flex flex-col gap-3.5">
            {problem && <Notice tone="error">{problem}</Notice>}
            <Field id="a-text" label="Message" helper={`Keep it short · ${form.text.length}/${MAX}`}>
              <Input id="a-text" value={form.text} maxLength={MAX} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="e.g. Free delivery on orders above ₹499" />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field id="a-start" label="Show from" helper="Empty = straight away">
                <Input id="a-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </Field>
              <Field id="a-end" label="Show till" helper="Empty = until switched off">
                <Input id="a-end" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={saving} fullWidth>
                {editingId ? "Save changes" : "Add announcement"}
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
  );
}
