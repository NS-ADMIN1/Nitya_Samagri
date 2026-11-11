"use client";

// apps/admin/components/team/MemberForm.tsx
//
// Add a staff member, or change an existing one's name, role and access.
// Email and phone are set when the account is created and cannot be
// changed afterwards (the API does not allow it).

import { useState } from "react";
import { roleLabel } from "../../lib/nav";
import { addMember, BASE_ROLES, EMPTY_MEMBER, updateMember, validateMember, type CustomRole, type Member, type MemberFormValues, type PermissionCatalog } from "../../lib/team";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import { Field, Input, Select } from "../ui/Field";
import Notice, { errorMessage } from "../ui/Notice";
import PermissionPicker from "./PermissionPicker";

interface MemberFormProps {
  /** The member being edited; leave out to add a new one. */
  member?: Member | null;
  catalog?: PermissionCatalog;
  roles: CustomRole[];
  /** `temporaryPassword` is set when a new account got an auto-made password. */
  onDone: (result?: { email: string; temporaryPassword: string }) => void;
  onCancel: () => void;
}

export default function MemberForm({ member, catalog, roles, onDone, onCancel }: MemberFormProps) {
  const adding = !member;
  const [values, setValues] = useState<MemberFormValues>(
    member
      ? { name: member.name, email: member.email || "", phone: member.phone || "", role: member.role, roleTemplate: member.roleTemplate?._id || "", permissions: member.permissions || [], password: "" }
      : { ...EMPTY_MEMBER, permissions: catalog?.defaultsByRole[EMPTY_MEMBER.role] || [] },
  );
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const errors = validateMember(values, adding);
  const shown = showErrors ? errors : {};
  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const everything = values.role === "super_admin";

  // Picking a base role resets the ticks to that role's usual access.
  const pickRole = (role: string) => setValues((v) => ({ ...v, role, permissions: catalog?.defaultsByRole[role] || [] }));
  // Picking a custom role adds its permissions on top of what is ticked.
  const pickTemplate = (id: string) => {
    const template = roles.find((r) => r._id === id);
    setValues((v) => ({ ...v, roleTemplate: id, permissions: template ? Array.from(new Set([...v.permissions, ...template.permissions])) : v.permissions }));
  };

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
      if (member) {
        await updateMember(member._id, values);
        onDone();
      } else {
        const temporaryPassword = await addMember(values);
        onDone(temporaryPassword ? { email: values.email.trim().toLowerCase(), temporaryPassword } : undefined);
      }
    } catch (err) {
      setSaveError(errorMessage(err, "saving team members"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-[22px]">
      <CardHeader title={member ? `Edit ${member.name}` : "Add team member"} subtitle={member ? member.email : "They sign in with their staff email and password"} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        {saveError && <Notice tone="error">{saveError}</Notice>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="m-name" label="Full name" error={shown.name}>
            <Input id="m-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Sharma" invalid={!!shown.name} />
          </Field>
          {adding && (
            <>
              <Field id="m-email" label="Staff email" helper="Must end in @adminns.in" error={shown.email}>
                <Input id="m-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="priya@adminns.in" invalid={!!shown.email} />
              </Field>
              <Field id="m-phone" label="Mobile number" helper="+91 and 10 digits, no spaces" error={shown.phone}>
                <Input id="m-phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+919876543210" invalid={!!shown.phone} />
              </Field>
              <Field id="m-password" label="Password (optional)" helper="Leave empty and a temporary one is made for you" error={shown.password}>
                <Input id="m-password" type="text" autoComplete="off" value={values.password} onChange={(e) => set("password", e.target.value)} invalid={!!shown.password} />
              </Field>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="m-role" label="Role" helper="Sets the usual access for this kind of work">
            <Select id="m-role" value={values.role} onChange={(e) => pickRole(e.target.value)}>
              {BASE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="m-template" label="Custom role (optional)" helper="Adds that role's access to the ticks below">
            <Select id="m-template" value={values.roleTemplate} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">None</option>
              {roles.filter((r) => !r.isSystem).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-navy">What this person can do</span>
          {everything ? <Notice>A Super Admin can do everything, including managing the team.</Notice> : <PermissionPicker catalog={catalog?.permissions || []} selected={values.permissions} onChange={(keys) => set("permissions", keys)} />}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" icon="check" loading={saving}>
            {member ? "Save changes" : "Add team member"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
