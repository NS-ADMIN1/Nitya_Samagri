// src/database/models/Counter.ts
//
// Running numbers that must never repeat (invoice numbers). One document
// per series, e.g. key "invoice:2026-27".
import { Schema, model, Document } from "mongoose";

export interface ICounter extends Document {
  key: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model<ICounter>("Counter", counterSchema);
