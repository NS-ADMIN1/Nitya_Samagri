// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }
  try {
    const token   = header.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as { userId: string; role: string };
    req.user      = decoded;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
