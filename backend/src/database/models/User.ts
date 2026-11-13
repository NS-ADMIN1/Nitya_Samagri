// src/database/models/User.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: "customer" | "admin" | "super_admin" | "order_manager" | "warehouse" | "pandit" | "support";
  // Fine-grained permissions for the Team & Roles system (additive on top of
  // `role`; super_admin implicitly has every permission regardless of this
  // list — see requirePermission() in rbac.middleware.ts). Only meaningful
  // for staff accounts, not customers.
  permissions: string[];
  roleTemplate?: Types.ObjectId; // which Role template this was last set up from, for display only
  invitedBy?: Types.ObjectId;
  status: "active" | "blocked";
  /** The phone number has been proven with a Firebase OTP. */
  isVerified: boolean;
  /** The email address has been proven with an emailed sign-up code. */
  emailVerified: boolean;
  loyaltyPoints: number;
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum";
  googleId?: string;
  firebaseUid?: string;
  fcmTokens: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true, unique: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["customer", "admin", "super_admin", "order_manager", "warehouse", "pandit", "support"], default: "customer" },
    permissions: [{ type: String }],
    roleTemplate: { type: Schema.Types.ObjectId, ref: "Role" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "blocked"], default: "active", index: true },
    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: { type: String, enum: ["bronze", "silver", "gold", "platinum"], default: "bronze" },
    googleId: { type: String, index: true, sparse: true },
    firebaseUid: { type: String, index: true, sparse: true },
    fcmTokens: [{ type: String }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
export type UserId = Types.ObjectId;