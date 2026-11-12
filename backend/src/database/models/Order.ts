// src/database/models/Order.ts
// Order embeds its address snapshot (immutable at time of purchase) and
// references OrderItem docs separately, matching how order.routes.ts reads
// order.items / order.address as populated relations.
import { Schema, model, Document, Types } from "mongoose";

export interface IOrderAddressSnapshot {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pin: string;
}

export interface IOrder extends Document {
  orderId: string; // human-readable, e.g. NS-20260917-0001
  userId: Types.ObjectId;
  addressId: Types.ObjectId;
  address: IOrderAddressSnapshot;
  subtotal: number;
  gst: number;
  shipping: number;
  discount: number;
  total: number;
  couponId?: Types.ObjectId;
  status: "pending" | "confirmed" | "processing" | "ready_for_pickup" | "shipped" | "out_for_delivery" | "delivered" | "NDR" | "cancelled" | "returned" | "refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
  paymentMethod?: "razorpay" | "upi" | "cod" | "card" | "netbanking" | "wallet";
  deliveryDate?: Date;
  deliverySlot?: string;
  notes?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
  refundId?: string;
  refundedAt?: Date;
  refundAmount?: number;
  trackingNo?: string;
  courierName?: string;
  invoiceNo?: string;   // tax invoice number, given the first time the invoice is opened
  invoiceDate?: Date;
  stockReleased: boolean; // true once this order's items were put back into stock (cancelled / returned / refunded before shipping)
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    addressId: { type: Schema.Types.ObjectId, ref: "Address", required: true },
    address: {
      name: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    gst: { type: Number, required: true },
    shipping: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "ready_for_pickup", "shipped", "out_for_delivery", "delivered", "NDR", "cancelled", "returned", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String, enum: ["razorpay", "upi", "cod", "card", "netbanking", "wallet"] },
    deliveryDate: { type: Date },
    deliverySlot: { type: String },
    notes: { type: String, maxlength: 500 },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    paidAt: { type: Date },
    refundId: { type: String },
    refundedAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    trackingNo: { type: String, index: true, sparse: true },
    courierName: { type: String },
    invoiceNo: { type: String, index: true, sparse: true, unique: true },
    invoiceDate: { type: Date },
    stockReleased: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", orderSchema);