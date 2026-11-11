"use client";

// apps/admin/components/store/SectionsTab.tsx
//
// Homepage sections: their order and whether each is switched on.
// Move sections with the arrows, then press "Save order".

import { useEffect, useState } from "react";
import { cmsUpdate, useCms, type Section } from "../../lib/cms";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import Toggle from "../ui/Toggle";
import NotOnSiteNotice from "./NotOnSiteNotice";

export default function SectionsTab() {
  const { data, error } = useCms<Section>("sections");
  const [sections, setSections] = useState<Section[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  // Take the saved order from the API whenever it (re)loads.
  useEffect(() => {
    if (data) {
      setSections(data);
      setDirty(false);
    }
  }, [data]);

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    setDirty(true);
    setMessage(null);
  };
  const toggle = (id: string, active: boolean) => {
    setSections((list) => list.map((s) => (s._id === id ? { ...s, active } : s)));
    setDirty(true);
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await Promise.all(sections.map((s, i) => cmsUpdate("sections", s._id, { active: s.active, sortOrder: i })));
      setMessage({ tone: "info", text: "Order saved." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "saving the homepage order") });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Notice tone="error">{errorMessage(error, "homepage sections")}</Notice>;

  const arrow = "flex h-11 w-11 items-center justify-center rounded-[10px] border border-field bg-white text-navy hover:bg-mist disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-col gap-5">
      <NotOnSiteNotice what="this section order" />
      <Card>
        <CardHeader
          title="Homepage sections"
          subtitle="Use the arrows to reorder. Switch off to hide a section."
          action={
            <Button icon="check" loading={saving} disabled={!dirty} onClick={save}>
              Save order
            </Button>
          }
        />
        {message && (
          <div className="mb-3">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}
        {!data ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-slate">No homepage sections have been set up yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {sections.map((s, i) => (
              <li key={s._id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line px-3 py-2.5 ${s.active ? "bg-white" : "bg-offwhite"}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mist text-[13px] font-bold tabular-nums text-navy">{i + 1}</span>
                <div className="min-w-0 flex-1 basis-[180px]">
                  <div className={`text-sm font-semibold ${s.active ? "text-navy" : "text-slate"}`}>{s.label}</div>
                  <div className="text-xs capitalize text-slate">{s.type.replace(/_/g, " ")}</div>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" aria-label={`Move ${s.label} up`} disabled={i === 0} onClick={() => move(i, -1)} className={arrow}>
                    <Icon name="chevronLeft" className="rotate-90" />
                  </button>
                  <button type="button" aria-label={`Move ${s.label} down`} disabled={i === sections.length - 1} onClick={() => move(i, 1)} className={arrow}>
                    <Icon name="chevronRight" className="rotate-90" />
                  </button>
                </div>
                <Toggle checked={s.active} label={`Show ${s.label}`} onChange={(next) => toggle(s._id, next)} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
