"use client";

// apps/admin/components/team/PermissionPicker.tsx — tick-boxes for permissions, grouped by area.

import type { PermissionDef } from "../../lib/team";

interface PermissionPickerProps {
  catalog: PermissionDef[];
  selected: string[];
  onChange: (keys: string[]) => void;
}

export default function PermissionPicker({ catalog, selected, onChange }: PermissionPickerProps) {
  const groups: Record<string, PermissionDef[]> = {};
  for (const p of catalog) (groups[p.group] ||= []).push(p);
  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);

  if (catalog.length === 0) return <p className="text-sm text-slate">Loading permissions…</p>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Object.entries(groups).map(([group, perms]) => (
        <fieldset key={group} className="rounded-xl border border-line bg-offwhite px-3 pb-1.5 pt-2.5">
          <legend className="px-1 text-xs font-semibold uppercase tracking-[0.06em] text-slate">{group}</legend>
          {perms.map((p) => (
            <label key={p.key} className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm text-navy">
              <input type="checkbox" checked={selected.includes(p.key)} onChange={() => toggle(p.key)} className="h-[18px] w-[18px] shrink-0 accent-navy" />
              {p.label}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
