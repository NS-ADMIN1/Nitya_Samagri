"use client";

// apps/admin/app/team/page.tsx
//
// Team & roles: who can sign in to the admin and what each person can do.
// Super admins only — the API refuses everyone else, and this page then
// shows a plain "no access" message.

import { useEffect, useState } from "react";
import AdminShell from "../../components/layout/AdminShell";
import MemberForm from "../../components/team/MemberForm";
import RolesPanel from "../../components/team/RolesPanel";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DataTable, { type Column } from "../../components/ui/DataTable";
import Notice, { errorMessage } from "../../components/ui/Notice";
import StatusPill from "../../components/ui/StatusPill";
import Tabs, { type TabItem } from "../../components/ui/Tabs";
import Toggle from "../../components/ui/Toggle";
import { formatWhen, plural } from "../../lib/format";
import { roleLabel } from "../../lib/nav";
import { setMemberStatus, useMembers, usePermissions, useRoles, type Member } from "../../lib/team";
import { getAdminSession } from "../../lib/adminAuth";

type TeamTab = "members" | "roles";

export default function TeamPage() {
  const { data: members, error, isLoading } = useMembers();
  const { data: roles } = useRoles();
  const { data: catalog } = usePermissions();

  const [tab, setTab] = useState<TeamTab>("members");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [newAccount, setNewAccount] = useState<{ email: string; temporaryPassword: string } | null>(null);

  // The signed-in user's id is in localStorage, so it is only known after mount.
  const [myId, setMyId] = useState<string | undefined>(undefined);
  useEffect(() => {
    setMyId(getAdminSession()?.user?.id);
  }, []);

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
  };

  const toggle = async (member: Member, allow: boolean) => {
    setBusyId(member._id);
    setActionError("");
    try {
      await setMemberStatus(member._id, allow ? "active" : "blocked");
    } catch (e) {
      setActionError(`${member.name}: ${errorMessage(e, "changing team members")}`);
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Member>[] = [
    {
      id: "member",
      header: "Member",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <Avatar name={m.name} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">
              {m.name}
              {m._id === myId && <span className="ml-1.5 text-xs font-normal text-slate">(you)</span>}
            </span>
            <span className="text-xs text-slate">{m.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (m) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill tone="navy" dot={false}>
            {roleLabel(m.role)}
          </StatusPill>
          {m.roleTemplate?.name && <span className="text-xs text-slate">+ {m.roleTemplate.name}</span>}
        </div>
      ),
    },
    { id: "access", header: "Access", cell: (m) => <span className="text-slate">{m.role === "super_admin" ? "Everything" : plural(m.permissions?.length || 0, "permission")}</span> },
    { id: "last", header: "Last signed in", cell: (m) => <span className="text-[13px] text-slate">{m.lastLoginAt ? formatWhen(m.lastLoginAt) : "Never"}</span> },
    {
      id: "signin",
      header: "Can sign in",
      cell: (m) =>
        // A super admin's access is not switched off from here, and nobody can block themselves.
        m.role === "super_admin" || m._id === myId ? (
          <span className="text-[13px] text-slate">{m.status === "active" ? "Yes" : "Blocked"}</span>
        ) : (
          <Toggle checked={m.status === "active"} disabled={busyId === m._id} label={`Allow ${m.name} to sign in`} onChange={(next) => toggle(m, next)} />
        ),
    },
    {
      id: "edit",
      header: "Edit",
      align: "right",
      cell: (m) =>
        m.role === "super_admin" ? null : (
          <Button
            variant="ghost"
            size="sm"
            icon="edit"
            onClick={() => {
              setAdding(false);
              setEditing(m);
            }}
          >
            Edit
          </Button>
        ),
    },
  ];

  const tabs: TabItem<TeamTab>[] = [
    { id: "members", label: "Members", count: members?.length },
    { id: "roles", label: "Roles & permissions" },
  ];
  const formOpen = adding || editing !== null;

  return (
    <AdminShell
      title="Team & roles"
      subtitle={members ? `${plural(members.length, "team member")} · only a Super Admin can change this page` : "Who can sign in to the admin, and what each person can do"}
      actions={
        !error && tab === "members" && !formOpen ? (
          <Button icon="plus" onClick={() => setAdding(true)}>
            Add team member
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <Notice tone="error">{errorMessage(error, "Team & roles")}</Notice>
      ) : (
        <>
          <Tabs
            label="Team sections"
            items={tabs}
            value={tab}
            onChange={(id) => {
              setTab(id);
              closeForm();
            }}
          />

          {tab === "members" ? (
            <>
              {newAccount && (
                <Notice tone="warning">
                  <strong>Account created.</strong> Temporary password for {newAccount.email}: <code className="rounded bg-white px-2 py-0.5 font-mono font-bold text-navy">{newAccount.temporaryPassword}</code>
                  <span className="block pt-1">Share it privately now. It will not be shown again.</span>
                  <span className="block pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setNewAccount(null)}>
                      I have saved it
                    </Button>
                  </span>
                </Notice>
              )}
              {actionError && <Notice tone="error">{actionError}</Notice>}

              {formOpen && (
                <MemberForm
                  key={editing?._id || "new"}
                  member={editing}
                  catalog={catalog}
                  roles={roles || []}
                  onCancel={closeForm}
                  onDone={(result) => {
                    closeForm();
                    if (result) setNewAccount(result);
                  }}
                />
              )}

              <Card padded={false}>
                <DataTable caption="Team members" columns={columns} rows={members || []} rowKey={(m) => m._id} loading={isLoading} emptyText="No team members yet. Add the first one." selectedKey={editing?._id} />
              </Card>
            </>
          ) : (
            <RolesPanel catalog={catalog} roles={roles} />
          )}
        </>
      )}
    </AdminShell>
  );
}
