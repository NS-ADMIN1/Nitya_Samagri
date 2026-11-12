// src/modules/brands/brand.schema.ts
import { z } from "zod";

export const BrandCreateSchema = z.object({
  name:    z.string({ required_error: "Brand name is required" }).trim().min(2, "Brand name is required").max(80),
  logoUrl: z.string().max(500).optional(),
});

export type BrandCreateInput = z.infer<typeof BrandCreateSchema>;
