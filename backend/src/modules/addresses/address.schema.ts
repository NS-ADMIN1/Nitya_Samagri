// src/modules/addresses/address.schema.ts
//
// apps/web's AddressForm mirrors these rules — change both together.
import { z } from "zod";
import { indianPhone } from "../../utils/validators";

export const AddressCreateSchema = z.object({
  label:     z.string().min(1).max(30).default("home"),
  fullName:  z.string().min(2).max(100),
  phone:     indianPhone("Phone must be in +91XXXXXXXXXX format"),
  line1:     z.string().min(3).max(200),
  line2:     z.string().max(200).optional(),
  city:      z.string().min(2).max(100),
  state:     z.string().min(2).max(100),
  pincode:   z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  isDefault: z.boolean().optional(),
});

export const AddressUpdateSchema = AddressCreateSchema.partial();

export type AddressCreateInput = z.infer<typeof AddressCreateSchema>;
export type AddressUpdateInput = z.infer<typeof AddressUpdateSchema>;
