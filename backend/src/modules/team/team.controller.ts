// src/modules/team/team.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as teamService from "./team.service";

// GET /api/v1/team/permissions
export const permissions = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: teamService.permissionCatalog() });
});

// ── Roles ─────────────────────────────────────────────────────────────────────

// GET /api/v1/team/roles
export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await teamService.listRoles();
  res.json({ success: true, data: { roles } });
});

// POST /api/v1/team/roles
export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await teamService.createRole(req.body, req.user!.userId);
  res.status(201).json({ success: true, data: { role } });
});

// PATCH /api/v1/team/roles/:id
export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await teamService.updateRole(req.params.id, req.body);
  res.json({ success: true, data: { role } });
});

// DELETE /api/v1/team/roles/:id
export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  await teamService.deleteRole(req.params.id);
  res.json({ success: true, data: { deleted: true } });
});

// ── Members ───────────────────────────────────────────────────────────────────

// GET /api/v1/team/members
export const listMembers = asyncHandler(async (_req: Request, res: Response) => {
  const members = await teamService.listMembers();
  res.json({ success: true, data: { members } });
});

// POST /api/v1/team/members
export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const data = await teamService.createMember(req.body, req.user!.userId);
  res.status(201).json({ success: true, data });
});

// PATCH /api/v1/team/members/:id
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await teamService.updateMember(req.params.id, req.body, req.user!.userId);
  res.json({ success: true, data: { member } });
});

// DELETE /api/v1/team/members/:id
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await teamService.removeMember(req.params.id, req.user!.userId);
  res.json({ success: true, data: { member } });
});

// POST /api/v1/team/members/:id/reset-password
export const resetMemberPassword = asyncHandler(async (req: Request, res: Response) => {
  const data = await teamService.resetMemberPassword(req.params.id);
  res.json({ success: true, data });
});
