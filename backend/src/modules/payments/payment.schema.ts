// src/modules/payments/payment.schema.ts
import { z } from "zod";

export const CreatePaymentOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const VerifyPaymentSchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  orderId:           z.string().min(1),
});

export const RefundSchema = z.object({
  orderId: z.string().min(1),
  amount:  z.number().positive().optional(), // rupees; leave out to refund everything that is left
  reason:  z.string().max(300).optional(),
  notes:   z.string().max(500).optional(),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type RefundInput        = z.infer<typeof RefundSchema>;
