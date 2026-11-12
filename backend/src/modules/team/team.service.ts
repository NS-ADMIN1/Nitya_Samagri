// src/modules/team/team.service.ts
//
// "Team & Roles": the super admin adds staff, gives each a base role plus
// permissions, and keeps reusable Role templates. Only the super admin can
// reach this module, so nobody else can hand out access.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../../database/models/User";
import { Role } from "../../database/models/Role";
import { DEFAULT_PERMISSIONS_BY_ROLE, PERMISSIONS } from "../../config/permissions";
import { AppError } from "../../utils/AppError";
import { revokeSessions } from "../auth/auth.service";
import { MemberCreateInput, MemberUpdateInput, RoleCreateInput, RoleUpdateInput, STAFF_ROLES } from "./team.schema";

/** e.g. "Ns-7f3a9c2e1b" — long enough for the login password rule. */
function temporaryPassword(): string {
  return `Ns-${crypto.randomBytes(5).toString("hex")}`;
}

async function findMember(id: string) {
  const member = await User.findById(id);
  if (!member || !(STAFF_ROLES as readonly string[]).includes(member.role)) {
    throw new AppError("Team member not found", 404);
  }
  return member;
}

// ── Permission catalog (for the checkbox UI) ──────────────────────────────────

export function permissionCatalog() {
  return { permissions: PERMISSIONS, defaultsByRole: DEFAULT_PERMISSIONS_BY_ROLE };
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export function listRoles() {
  return Role.find().sort({ isSystem: -1, name: 1 }).lean();
}

export async function createRole(input: RoleCreateInput, createdBy: string) {
  if (await Role.exists({ name: input.name })) throw new AppError("A role with this name already exists", 409);
  return Role.create({ ...input, createdBy });
}

export async function updateRole(id: string, input: RoleUpdateInput) {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.isSystem) throw new AppError("Built-in roles can't be edited — create a custom role instead", 400);

  Object.assign(role, input);
  await role.save();
  return role;
}

export async function deleteRole(id: string) {
  const role = await Role.findById(id);
  if (!role) throw new AppError("Role not found", 404);
  if (role.isSystem) throw new AppError("Built-in roles can't be deleted", 400);

  const inUse = await User.countDocuments({ roleTemplate: role._id });
  if (inUse > 0) throw new AppError(`${inUse} member(s) are using this role. Reassign them first.`, 409);

  await role.deleteOne();
}

// ── Members ───────────────────────────────────────────────────────────────────

export function listMembers() {
  return User.find({ role: { $in: STAFF_ROLES } })
    .select("name email phone role permissions roleTemplate status lastLoginAt createdAt invitedBy")
    .populate("roleTemplate", "name")
    .populate("invitedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Add a staff member. Their permissions are, in order: the Role template's
 * (plus any extra ticked), else the ones ticked, else the defaults for
 * their base role. Returns the temporary password once, when one was generated.
 */
export async function createMember(input: MemberCreateInput, invitedBy: string) {
  const email = input.email.toLowerCase();

  if (await User.exists({ $or: [{ email }, { phone: input.phone }] })) {
    throw new AppError("A user with this email or phone already exists", 409);
  }

  let permissions = input.permissions.length ? input.permissions : DEFAULT_PERMISSIONS_BY_ROLE[input.role] || [];
  if (input.roleTemplate) {
    const template = await Role.findById(input.roleTemplate);
    if (!template) throw new AppError("Role template not found", 404);
    permissions = Array.from(new Set([...template.permissions, ...input.permissions]));
  }

  const password = input.password || temporaryPassword();

  const member = await User.create({
    name: input.name,
    email,
    phone: input.phone,
    role: input.role,
    permissions,
    roleTemplate: input.roleTemplate || undefined,
    password: await bcrypt.hash(password, 12),
    isVerified: true,
    status: "active",
    invitedBy,
  });

  return {
    member: { id: member._id, name: member.name, email: member.email, role: member.role, permissions: member.permissions },
    temporaryPassword: input.password ? undefined : password,
  };
}

export async function updateMember(id: string, input: MemberUpdateInput, actingUserId: string) {
  const member = await findMember(id);
  const isSelf = String(member._id) === actingUserId;

  if (isSelf && input.role && input.role !== member.role) throw new AppError("You can't demote your own account", 400);
  if (isSelf && input.status === "blocked") throw new AppError("You can't block your own account", 400);

  const roleChanged = input.role !== undefined && input.role !== member.role;

  if (input.name !== undefined) member.name = input.name;
  if (input.role !== undefined) member.role = input.role;
  if (input.status !== undefined) member.status = input.status;
  if (input.roleTemplate !== undefined) {
    member.set("roleTemplate", input.roleTemplate || undefined);
  }

  if (input.permissions !== undefined) {
    member.permissions = input.permissions;
  } else if (input.roleTemplate) {
    const template = await Role.findById(input.roleTemplate);
    if (template) member.permissions = Array.from(new Set([...template.permissions, ...member.permissions]));
  }

  await member.save();

  // A blocked member is signed out; a changed role needs a fresh login to take effect in their token.
  if (member.status === "blocked" || roleChanged) await revokeSessions(String(member._id));

  return member;
}

/**
 * "Remove" blocks the account instead of deleting it, so records that point
 * to this person (who invited whom, who adjusted stock) keep working.
 */
export async function removeMember(id: string, actingUserId: string) {
  if (id === actingUserId) throw new AppError("You can't remove your own account", 400);

  const member = await findMember(id);
  member.status = "blocked";
  await member.save();
  await revokeSessions(String(member._id));
  return member;
}

/** Give a member a new temporary password (shown once) and sign them out. */
export async function resetMemberPassword(id: string) {
  const member = await findMember(id);

  const password = temporaryPassword();
  member.password = await bcrypt.hash(password, 12);
  await member.save();
  await revokeSessions(String(member._id));

  return { temporaryPassword: password };
}
