// src/database/models/StoreSettings.ts
//
// The store's own details — one document for the whole shop (key: "store").
// Shown on invoices and, the public part, on the storefront.
import { Schema, model, Document } from "mongoose";

export interface IStoreSettings extends Document {
  key: string;
  storeName: string;
  legalName?: string; // registered business name printed on invoices
  gstin?: string;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  supportPhone?: string;
  supportEmail?: string;
  invoicePrefix: string; // e.g. "NS" → NS/2026-27/000123
  createdAt: Date;
  updatedAt: Date;
}

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    key: { type: String, required: true, unique: true, default: "store" },
    storeName: { type: String, required: true, default: "Nitya Samagri", trim: true },
    legalName: { type: String, trim: true },
    gstin: { type: String, uppercase: true, trim: true },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    supportPhone: { type: String, trim: true },
    supportEmail: { type: String, trim: true, lowercase: true },
    invoicePrefix: { type: String, default: "NS", uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const StoreSettings = model<IStoreSettings>("StoreSettings", storeSettingsSchema);
