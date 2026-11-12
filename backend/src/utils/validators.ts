// src/utils/validators.ts
//
// Zod building blocks shared by the module *.schema.ts files.
import { z } from "zod";

/** A MongoDB ObjectId as a 24-character hex string. */
export const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

/** Route params for "/:id" routes. */
export const IdParamSchema = z.object({ id: objectId() });

/** Indian mobile number in +91XXXXXXXXXX form. */
export const indianPhone = (message = "Invalid Indian mobile number") =>
  z.string().regex(/^\+91[6-9]\d{9}$/, message);

/** ?page=&limit= for list endpoints. */
export const pageQuery = (maxLimit = 100, defaultLimit = 20) => ({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
});
