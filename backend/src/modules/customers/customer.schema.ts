// src/modules/customers/customer.schema.ts
import { z } from "zod";
import { pageQuery } from "../../utils/validators";

export const CustomerListQuerySchema = z.object({
  ...pageQuery(100, 20),
  q: z.string().optional(),
});

export const CustomerStatusSchema = z.object({
  status: z.enum(["active", "blocked"]),
});

export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
