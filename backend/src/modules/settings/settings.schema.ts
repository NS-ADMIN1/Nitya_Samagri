// src/modules/settings/settings.schema.ts
import { z } from "zod";
import { indianPhone } from "../../utils/validators";

/** 15 characters: 2-digit state code + PAN + entity number + "Z" + check character. */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const SettingsUpdateSchema = z.object({
  storeName: z.string().trim().min(2).max(80).optional(),
  legalName: z.string().trim().max(120).optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || GSTIN.test(v), { message: "Enter a valid 15-character GSTIN" })
    .optional(),
  address: z
    .object({
      line1:   z.string().trim().max(200).optional(),
      line2:   z.string().trim().max(200).optional(),
      city:    z.string().trim().max(100).optional(),
      state:   z.string().trim().max(100).optional(),
      pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(),
    })
    .optional(),
  supportPhone:  indianPhone("Phone must be in +91XXXXXXXXXX format").optional(),
  supportEmail:  z.string().email().optional(),
  invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,6}$/, "Use 1 to 6 letters or numbers").optional(),
});

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
