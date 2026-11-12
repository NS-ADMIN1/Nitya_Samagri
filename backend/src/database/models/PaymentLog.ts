// src/database/models/PaymentLog.ts
// Fields match usage in payments/payment.routes.ts.
import { Schema, model, Document, Types } from "mongoose";

export interface IPaymentLog extends Document {
  orderId: Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  status: "created" | "captured" | "failed" | "refunded";
  method?: string;
  gateway: string;
  errorCode?: string;
  errorDescription?: string;
  refundId?: string; // Razorpay refund ID, on "refunded" entries
  createdAt: Date;
}

const paymentLogSchema = new Schema<IPaymentLog>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "captured", "failed", "refunded"], required: true },
    method: { type: String },
    gateway: { type: String, default: "razorpay" },
    errorCode: { type: String },
    errorDescription: { type: String },
    refundId: { type: String, index: true, sparse: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PaymentLog = model<IPaymentLog>("PaymentLog", paymentLogSchema);