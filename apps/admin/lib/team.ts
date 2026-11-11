// apps/admin/lib/team.ts
//
// Staff accounts and what each can do. Every call here is super-admin only
// on the API (/team/*):
//   GET  /team/permissions            the permission list + defaults per base role
//   GET/POST /team/members            list / add staff
//   PATCH /team/members/:id           edit, block or unblock
//   GET/POST /team/roles, PATCH/DELETE /team/roles/:id   custom roles

import useSWR, { mutate } from "swr";
import { api } from "./api";

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export interface PermissionCatalog {
  permissions: PermissionDef[];
  defaultsByRole: Record<string, string[]>;
}

export interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

export interface Member {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  permissions?: string[];
  roleTemplate?: { _id: string; name: string } | null;
  status: "active" | "blocked";
  lastLoginAt?: string;
  createdAt?: string;
}

/** Base roles a staff account can have, in the order shown on screen. */
export const BASE_ROLES = ["admin", "order_manager", "warehouse", "support", "pandit", "super_admin"] as const;

const MEMBERS = "/api/v1/team/members";
const ROLES = "/api/v1/team/roles";
const PERMISSIONS = "/api/v1/team/permissions";
const options = { shouldRetryOnError: false };

export const useMembers = () => useSWR(MEMBERS, (u: string) => api.get<{ data: { members: Member[] } }>(u).then((r) => r.data.members), options);
export const useRoles = () => useSWR(ROLES, (u: string) => api.get<{ data: { roles: CustomRole[] } }>(u).then((r) => r.data.roles), options);
export const usePermissions = () => useSWR(PERMISSIONS, (u: string) => api.get<{ data: PermissionCatalog }>(u).then((r) => r.data), options);

export interface MemberFormValues {
  name: string;
  email: string;
  phone: string;
  role: string;
  /** Custom role _id, or "" for none. */
  roleTemplate: string;
  permissions: string[];
  /** Only when adding; empty = the API makes a temporary password. */
  password: string;
}

export const EMPTY_MEMBER: MemberFormValues = { name: "", email: "", phone: "+91", role: "support", roleTemplate: "", permissions: [], password: "" };

export type MemberErrors = Partial<Record<keyof MemberFormValues, string>>;

/** Same rules as the API (MemberSchema), worded for staff. */
export function validateMember(v: MemberFormValues, adding: boolean): MemberErrors {
  const errors: MemberErrors = {};
  if (v.name.trim().length < 2) errors.name = "Enter the person's full name";
  if (adding) {
    if (!/^[^\s@]+@adminns\.in$/i.test(v.email.trim())) errors.email = "Use a staff email ending in @adminns.in";
    if (!/^\+91[6-9]\d{9}$/.test(v.phone.trim())) errors.phone = "Enter +91 followed by the 10-digit mobile number";
    if (v.password && (v.password.length < 8 || v.password.length > 72)) errors.password = "Use at least 8 characters, or leave it empty";
  }
  return errors;
}

/** Adds a staff account. Returns the temporary password when the API generated one (shown once). */
export async function addMember(v: MemberFormValues): Promise<string | undefined> {
  const res = await api.post<{ data: { temporaryPassword?: string } }>(MEMBERS, {
    name: v.name.trim(),
    email: v.email.trim().toLowerCase(),
    phone: v.phone.trim(),
    role: v.role,
    roleTemplate: v.roleTemplate || undefined,
    permissions: v.permissions,
    password: v.password || undefined,
  });
  await mutate(MEMBERS);
  return res.data.temporaryPassword;
}

export async function updateMember(id: string, v: MemberFormValues): Promise<void> {
  await api.patch(`${MEMBERS}/${id}`, { name: v.name.trim(), role: v.role, roleTemplate: v.roleTemplate || null, permissions: v.permissions });
  await mutate(MEMBERS);
}

/** Blocked staff keep their history but cannot sign in. */
export async function setMemberStatus(id: string, status: "active" | "blocked"): Promise<void> {
  await api.patch(`${MEMBERS}/${id}`, { status });
  await mutate(MEMBERS);
}

export interface RoleFormValues {
  name: string;
  description: string;
  permissions: string[];
}

export async function saveRole(id: string | null, v: RoleFormValues): Promise<void> {
  const body = { name: v.name.trim(), description: v.description.trim() || undefined, permissions: v.permissions };
  if (id) await api.patch(`${ROLES}/${id}`, body);
  else await api.post(ROLES, body);
  await mutate(ROLES);
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`${ROLES}/${id}`);
  await mutate(ROLES);
}
