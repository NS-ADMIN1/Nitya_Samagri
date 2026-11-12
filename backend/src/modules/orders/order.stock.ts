// src/modules/orders/order.stock.ts
//
// What an order holds while it is open: stock for its items and one use of
// its coupon. reserveStock() takes the stock when the order is placed;
// releaseOrderHolds() gives everything back, at most once per order.
// Both run inside the caller's MongoDB transaction.
import { ClientSession, Types } from "mongoose";
import { IOrder } from "../../database/models/Order";
import { OrderItem } from "../../database/models/OrderItem";
import { Product } from "../../database/models/Product";
import { ProductVariant } from "../../database/models/ProductVariant";
import { Coupon } from "../../database/models/Coupon";
import { InventoryLog } from "../../database/models/InventoryLog";
import { AppError } from "../../utils/AppError";

export interface StockLine {
  productId:  string;
  variantId?: string;
  qty:        number;
  name:       string; // for the error message
}

/**
 * Take stock for each line and count the sale. The `stock >= qty` condition
 * is part of the update itself, so two customers racing for the last unit
 * cannot both get it.
 */
export async function reserveStock(lines: StockLine[], session: ClientSession, orderId: string): Promise<void> {
  for (const line of lines) {
    if (line.variantId) {
      const result = await ProductVariant.updateOne(
        { _id: line.variantId, stock: { $gte: line.qty } },
        { $inc: { stock: -line.qty } },
        { session }
      );
      if (result.modifiedCount === 0) {
        throw new AppError(`Insufficient stock for ${line.name} (variant) — please review your cart`, 409);
      }
      await Product.updateOne({ _id: line.productId }, { $inc: { sold: line.qty } }, { session });
    } else {
      const result = await Product.updateOne(
        { _id: line.productId, stock: { $gte: line.qty } },
        { $inc: { stock: -line.qty, sold: line.qty } },
        { session }
      );
      if (result.modifiedCount === 0) {
        throw new AppError(`Insufficient stock for ${line.name} — please review your cart`, 409);
      }
    }
  }

  // Stock history: one line per item sold
  await InventoryLog.insertMany(
    lines.map((l) => ({ productId: l.productId, variantId: l.variantId, change: -l.qty, reason: "order" as const, note: `Order ${orderId}` })),
    { session }
  );
}

/**
 * Put an order's items back into stock, and (when asked) give its coupon
 * use back. Does nothing if this order's stock was already released, so it
 * is safe to call from every cancel / return / refund path.
 *
 * Marks `order.stockReleased` — the caller saves the order.
 * Returns the product IDs whose stock changed (for clearProductCache in cache/product.cache.ts).
 */
export async function releaseOrderHolds(
  order: IOrder,
  session: ClientSession,
  options: { releaseCoupon: boolean }
): Promise<Types.ObjectId[]> {
  if (order.stockReleased) return [];

  const items = await OrderItem.find({ orderId: order._id }).session(session);

  for (const item of items) {
    if (item.variantId) {
      await ProductVariant.updateOne({ _id: item.variantId }, { $inc: { stock: item.qty } }, { session });
    } else {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }, { session });
    }
    // Undo the sale count. The `sold >= qty` condition keeps it from going
    // below zero for orders placed before sales were counted.
    await Product.updateOne(
      { _id: item.productId, sold: { $gte: item.qty } },
      { $inc: { sold: -item.qty } },
      { session }
    );
  }

  if (options.releaseCoupon && order.couponId) {
    await Coupon.updateOne({ _id: order.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
  }

  // Stock history: one line per item put back
  await InventoryLog.insertMany(
    items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      change:    i.qty,
      reason:    "return" as const,
      note:      `Order ${order.orderId} — items back in stock`,
    })),
    { session }
  );

  order.stockReleased = true;
  return items.map((i) => i.productId);
}
