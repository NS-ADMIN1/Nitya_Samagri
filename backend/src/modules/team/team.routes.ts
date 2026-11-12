// src/modules/team/team.routes.ts
//
// Team & Roles — super admin only.
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { IdParamSchema } from "../../utils/validators";
import { MemberCreateSchema, MemberUpdateSchema, RoleCreateSchema, RoleUpdateSchema } from "./team.schema";
import * as teamController from "./team.controller";

const router = Router();
const id = validate(IdParamSchema, "params");

router.use(authenticate, requireRole(["super_admin"]));

router.get("/permissions", teamController.permissions);

router.get("/roles",        teamController.listRoles);
router.post("/roles",       validate(RoleCreateSchema), teamController.createRole);
router.patch("/roles/:id",  id, validate(RoleUpdateSchema), teamController.updateRole);
router.delete("/roles/:id", id, teamController.deleteRole);

router.get("/members",        teamController.listMembers);
router.post("/members",       validate(MemberCreateSchema), teamController.createMember);
router.patch("/members/:id",  id, validate(MemberUpdateSchema), teamController.updateMember);
router.delete("/members/:id", id, teamController.removeMember);
router.post("/members/:id/reset-password", id, teamController.resetMemberPassword);

export default router;
