// src/modules/inventory/inventory.schema.ts
import { z } from "zod";
import { objectId, pageQuery } from "../../utils/validators";

// One stock correction: set the count, or add / subtract a quantity.
export const StockUpdateSchema = z.object({
  quantity:  z.number().int().min(0),
  operation: z.enum(["set", "add", "subtract"]),
  variantId: objectId().optional(), // for a product sold in pack sizes
  note:      z.string().max(300).optional(),
});

// A delivery from a supplier: several products received at once.
export const ReceiveStockSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId(),
        variantId: objectId().optional(),
        quantity:  z.number().int().min(1),
      })
    )
    .min(1)
    .max(200),
  note: z.string().max(300).optional(),
});

export const StockLogsQuerySchema = z.object({
  ...pageQuery(100, 30),
  productId: objectId().optional(),
  reason:    z.enum(["order", "manual_adjustment", "return", "restock"]).optional(),
});

export type StockUpdateInput  = z.infer<typeof StockUpdateSchema>;
export type ReceiveStockInput = z.infer<typeof ReceiveStockSchema>;
export type StockLogsQuery    = z.infer<typeof StockLogsQuerySchema>;
