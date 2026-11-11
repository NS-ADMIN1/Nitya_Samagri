"use client";

// apps/admin/components/team/RolesPanel.tsx
//
// "Roles & permissions" tab: a read-only table of what each built-in role
// can do, and the custom roles (reusable bundles of permissions) which can
// be created, edited and deleted.

import { useState } from "react";
import { roleLabel } from "../../lib/nav";
import { BASE_ROLES, deleteRole, saveRole, type CustomRole, type PermissionCatalog, type RoleFormValues } from "../../lib/team";
import ConfirmDelete from "../store/ConfirmDelete";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input } from "../ui/Field";
import Icon from "../ui/Icon";
import Notice, { errorMessage } from "../ui/Notice";
import PermissionPicker from "./PermissionPicker";

const EMPTY: RoleFormValues = { name: "", description: "", permissions: [] };
// Super Admin always has everything, so it is left out of the comparison table.
const TABLE_ROLES = BASE_ROLES.filter((r) => r !== "super_admin");

interface RolesPanelProps {
  catalog?: PermissionCatalog;
  roles?: CustomRole[];
}

export default function RolesPanel({ catalog, roles }: RolesPanelProps) {
  const [form, setForm] = useState<RoleFormValues>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  const custom = (roles || []).filter((r) => !r.isSystem);
  const labelOf = (key: string) => catalog?.permissions.find((p) => p.key === key)?.label || key;
  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setProblem("");
  };

  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setProblem("Enter a name for the role.");
    if (form.permissions.length === 0) return setProblem("Tick at least one permission.");
    setSaving(true);
    setProblem("");
    try {
      await saveRole(editingId, form);
      close();
    } catch (err) {
      setProblem(errorMessage(err, "saving roles"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role: CustomRole) => {
    setProblem("");
    try {
      await deleteRole(role._id);
    } catch (err) {
      setProblem(errorMessage(err, "deleting roles"));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="What each role can do" subtitle="The usual access for each built-in role. Adjust one person's access from Members → Edit." />
        {!catalog ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <caption className="sr-only">Permissions by role</caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b border-line bg-[#FBFBF9] px-3.5 py-2.5 text-left text-xs font-semibold text-slate">
                    Permission
                  </th>
                  {TABLE_ROLES.map((role) => (
                    <th key={role} scope="col" className="whitespace-nowrap border-b border-line bg-[#FBFBF9] px-3.5 py-2.5 text-center text-xs font-semibold text-slate">
                      {roleLabel(role)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.permissions.map((p) => (
                  <tr key={p.key}>
                    <th scope="row" className="border-b border-[#EEF0F3] px-3.5 py-2.5 text-left text-sm font-medium text-navy">
                      {p.label}
                      <span className="block text-xs font-normal text-slate">{p.group}</span>
                    </th>
                    {TABLE_ROLES.map((role) => {
                      const yes = (catalog.defaultsByRole[role] || []).includes(p.key);
                      return (
                        <td key={role} className="border-b border-[#EEF0F3] px-3.5 py-2.5 text-center">
                          {yes ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white">
                              <Icon name="check" size={13} strokeWidth={3} label={`${roleLabel(role)}: yes`} />
                            </span>
                          ) : (
                            <span className="text-slate" aria-label={`${roleLabel(role)}: no`}>
                              –
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Custom roles"
          subtitle="Reusable bundles of permissions you can apply when adding or editing a member"
          action={
            !open ? (
              <Button variant="ghost" size="sm" icon="plus" onClick={() => setOpen(true)}>
                Create custom role
              </Button>
            ) : undefined
          }
        />
        {problem && !open && (
          <div className="mb-3">
            <Notice tone="error">{problem}</Notice>
          </div>
        )}

        {open && (
          <form onSubmit={save} className="mb-4 flex flex-col gap-3.5 rounded-xl border border-navy bg-[#F4F6FB] p-3.5">
            {problem && <Notice tone="error">{problem}</Notice>}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Field id="r-name" label="Role name">
                <Input id="r-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Festival content editor" />
              </Field>
              <Field id="r-desc" label="Description (optional)">
                <Input id="r-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What this role is for" />
              </Field>
            </div>
            <PermissionPicker catalog={catalog?.permissions || []} selected={form.permissions} onChange={(keys) => setForm((f) => ({ ...f, permissions: keys }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={saving} onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingId ? "Save role" : "Create role"}
              </Button>
            </div>
          </form>
        )}

        {!roles ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : custom.length === 0 ? (
          <p className="text-sm text-slate">No custom roles yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {custom.map((role) => (
              <li key={role._id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                <div className="min-w-0 flex-1 basis-[260px]">
                  <div className="text-sm font-semibold text-navy">{role.name}</div>
                  {role.description && <div className="text-xs text-slate">{role.description}</div>}
                  <div className="mt-1 text-[13px] text-slate">{role.permissions.map(labelOf).join(" · ")}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={() => {
                    setEditingId(role._id);
                    setForm({ name: role.name, description: role.description || "", permissions: role.permissions });
                    setProblem("");
                    setOpen(true);
                  }}
                >
                  Edit
                </Button>
                <ConfirmDelete onDelete={() => remove(role)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
