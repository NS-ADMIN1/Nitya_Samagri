// src/middlewares/error.middleware.ts
//
// The single place every error becomes an HTTP response. Response shape:
//   { success: false, message, errors?: [{ field, message }] }
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

type FieldError = { field: string; message: string };

interface IncomingError extends Error {
  statusCode?:    number;
  isOperational?: boolean;
  errors?:        unknown;
  code?:          number | string;
  type?:          string;
  path?:          string;
  keyValue?:      Record<string, unknown>;
}

interface ErrorReply {
  status:  number;
  message: string;
  errors?: FieldError[];
}

/** Turn a known error into a client-safe reply, or null if it's unexpected. */
function toReply(err: IncomingError): ErrorReply | null {
  // Errors we threw on purpose (AppError)
  if (err.isOperational) {
    return {
      status:  err.statusCode || 500,
      message: err.message,
      errors:  Array.isArray(err.errors) ? (err.errors as FieldError[]) : undefined,
    };
  }

  // Mongoose: a value that can't be cast, e.g. a malformed ID in the URL
  if (err.name === "CastError") {
    return { status: 400, message: err.path === "_id" ? "Invalid ID" : `Invalid value for ${err.path}` };
  }

  // Mongoose: schema validation failed on save
  if (err.name === "ValidationError" && err.errors && typeof err.errors === "object") {
    const errors = Object.values(err.errors as Record<string, { path?: string; message?: string }>).map((e) => ({
      field:   e.path || "",
      message: e.message || "Invalid value",
    }));
    return { status: 400, message: "Validation failed", errors };
  }

  // MongoDB: unique index violation
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return { status: 409, message: field ? `A record with this ${field} already exists.` : "This record already exists." };
  }

  // body-parser: malformed or oversized request body
  if (err.type === "entity.parse.failed") return { status: 400, message: "Invalid JSON in request body" };
  if (err.type === "entity.too.large")    return { status: 413, message: "Request body is too large" };

  return null;
}

export function errorHandler(err: IncomingError, _req: Request, res: Response, _next: NextFunction) {
  const reply = toReply(err);

  if (!reply) logger.error("Unexpected error:", err);

  res.status(reply?.status ?? 500).json({
    success: false,
    message: reply?.message ?? "Internal server error",
    ...(reply?.errors && { errors: reply.errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
