// src/modules/orders/order.schema.ts
import { z } from "zod";
import { objectId, pageQuery } from "../../utils/validators";

export const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId(),
        variantId: objectId().optional(),
        qty:       z.number().int().min(1),
      })
    )
    .min(1),
  addressId:     objectId(),
  deliveryDate:  z.string().datetime().optional(),
  deliverySlot:  z.string().optional(),
  couponCode:    z.string().optional(),
  paymentMethod: z.enum(["razorpay", "upi", "cod", "card", "netbanking", "wallet"]),
  notes:         z.string().max(500).optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().max(300).optional(),
});

// "pending" is where every order starts and "NDR" comes from the courier —
// neither is set by hand.
export const UpdateStatusSchema = z.object({
  status: z.enum([
    "confirmed", "processing", "ready_for_pickup", "shipped", "out_for_delivery",
    "delivered", "cancelled", "returned", "refunded",
  ]),
  trackingNo:  z.string().optional(),
  courierName: z.string().optional(),
  note:        z.string().optional(),
});

export const MyOrdersQuerySchema = z.object({
  ...pageQuery(50, 10),
  status: z.string().optional(),
});

export const AdminOrdersQuerySchema = z.object({
  ...pageQuery(100, 20),
  status:   z.string().optional(),
  payment:  z.string().optional(),
  q:        z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
});

export type CreateOrderInput  = z.infer<typeof CreateOrderSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type MyOrdersQuery     = z.infer<typeof MyOrdersQuerySchema>;
export type AdminOrdersQuery  = z.infer<typeof AdminOrdersQuerySchema>;
