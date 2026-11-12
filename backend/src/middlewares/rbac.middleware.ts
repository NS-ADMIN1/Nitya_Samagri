// src/middlewares/rbac.middleware.ts
//
// Who may call a route. Both run after authenticate().
//   requireRole(["super_admin"])            — by the role inside the login token
//   requirePermission("orders.manage")      — by the staff member's permissions
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { User } from "../database/models/User";
import { effectivePermissions } from "../config/permissions";

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Authentication required", 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied. Required role: ${roles.join(" or ")}`, 403));
    }
    next();
  };
}

/**
 * Allow staff who hold ANY ONE of the given permissions (see
 * config/permissions.ts for the list and the per-role defaults).
 *
 * The login token only carries { userId, role }, so this reads the member's
 * current role, permissions and status from the database on each request.
 * That makes a change by the super admin — a permission removed, a member
 * blocked — take effect on that member's very next request.
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError("Authentication required", 401));

      const user = await User.findById(req.user.userId).select("role permissions status").lean();
      if (!user || user.status !== "active" || user.role === "customer") {
        return next(new AppError("Access denied", 403));
      }

      const held = effectivePermissions(user);
      if (!permissions.some((p) => held.includes(p))) {
        return next(new AppError(`Access denied. Missing permission: ${permissions.join(" or ")}`, 403));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
