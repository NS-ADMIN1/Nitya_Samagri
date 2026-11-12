// src/middlewares/optionalAuth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * For routes that are public but show more to a signed-in person.
 *   no token      → carries on as a visitor
 *   valid token   → sets req.user
 *   expired token → 401, so the app renews its login and asks again (rather
 *                   than quietly being shown the visitor's view)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    req.user = jwt.verify(header.split(" ")[1], env.JWT_SECRET, { algorithms: ["HS256"] }) as { userId: string; role: string };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
