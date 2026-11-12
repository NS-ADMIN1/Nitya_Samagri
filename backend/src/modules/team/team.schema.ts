// src/modules/team/team.schema.ts
import { z } from "zod";
import { isValidPermission } from "../../config/permissions";
import { indianPhone, objectId } from "../../utils/validators";

export const STAFF_ROLES = ["admin", "super_admin", "order_manager", "warehouse", "pandit", "support"] as const;

const permissionList = () =>
  z.array(z.string()).refine((list) => list.every(isValidPermission), { message: "Unknown permission key" });

// ── Roles (reusable permission templates) ─────────────────────────────────────
export const RoleCreateSchema = z.object({
  name:        z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  permissions: permissionList().refine((list) => list.length > 0, { message: "Pick at least one permission" }),
});

export const RoleUpdateSchema = z.object({
  name:        z.string().min(2).max(60).optional(),
  description: z.string().max(200).optional(),
  permissions: permissionList().refine((list) => list.length > 0, { message: "Pick at least one permission" }).optional(),
});

// ── Members ───────────────────────────────────────────────────────────────────
export const MemberCreateSchema = z.object({
  name:  z.string().min(2).max(60),
  email: z
    .string()
    .email()
    .refine((e) => e.toLowerCase().endsWith("@adminns.in"), { message: "Staff accounts must use an @adminns.in email" }),
  phone:        indianPhone(),
  role:         z.enum(STAFF_ROLES),
  roleTemplate: objectId().optional(),              // Role used to prefill permissions
  permissions:  permissionList().default([]),
  password:     z.string().min(8).max(72).optional(), // a temporary one is generated if left out
});

export const MemberUpdateSchema = z.object({
  name:         z.string().min(2).max(60).optional(),
  role:         z.enum(STAFF_ROLES).optional(),
  roleTemplate: objectId().nullable().optional(),
  permissions:  permissionList().optional(),
  status:       z.enum(["active", "blocked"]).optional(),
});

export type RoleCreateInput   = z.infer<typeof RoleCreateSchema>;
export type RoleUpdateInput   = z.infer<typeof RoleUpdateSchema>;
export type MemberCreateInput = z.infer<typeof MemberCreateSchema>;
export type MemberUpdateInput = z.infer<typeof MemberUpdateSchema>;
