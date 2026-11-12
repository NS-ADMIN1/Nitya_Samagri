// src/modules/shipping/shipping.schema.ts
import { z } from "zod";

export const ShippingRatesQuerySchema = z.object({
  pincode:    z.string().regex(/^\d{6}$/, "Invalid pincode"),
  weight:     z.coerce.number().positive().default(0.5),
  orderValue: z.coerce.number().min(0).default(0),
  cod:        z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

export const ShippingCreateSchema = z.object({
  orderId: z.string().min(1),
});

export type ShippingRatesQuery = z.infer<typeof ShippingRatesQuerySchema>;
