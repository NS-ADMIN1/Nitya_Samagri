// src/modules/inventory/inventory.service.ts
//
// Stock changes made by the team, and the stock history. Every change is
// written to InventoryLog in the same transaction as the change itself, so
// the history always adds up. (Sales and returns are logged by the orders
// module — orders/order.stock.ts.)
import mongoose, { ClientSession, Model } from "mongoose";
import { Product } from "../../database/models/Product";
import { ProductVariant } from "../../database/models/ProductVariant";
import { InventoryLog } from "../../database/models/InventoryLog";
import { clearProductCache } from "../../cache/product.cache";
import { AppError } from "../../utils/AppError";
import { paginate } from "../../utils/paginate";
import { ReceiveStockInput, StockLogsQuery, StockUpdateInput } from "./inventory.schema";

/**
 * Where a product's stock is kept: on the variant when a pack size is
 * named, otherwise on the product itself.
 */
async function stockHolder(productId: string, variantId: string | undefined, session: ClientSession) {
  if (!variantId) return { model: Product as Model<any>, id: productId };

  const variant = await ProductVariant.findOne({ _id: variantId, productId }).session(session);
  if (!variant) throw new AppError("That pack size does not belong to this product", 404);
  return { model: ProductVariant as Model<any>, id: variantId };
}

// ── Changing stock ────────────────────────────────────────────────────────────

/** PATCH /products/:id/stock — a single correction. Returns the new stock count. */
export async function adjustStock(productId: string, input: StockUpdateInput, userId: string): Promise<number> {
  let newStock = 0;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { model, id } = await stockHolder(productId, input.variantId, session);

      const current = await model.findById(id).session(session);
      if (!current) throw new AppError("Product not found", 404);

      let change: number;
      if (input.operation === "set") {
        change = input.quantity - current.stock;
        current.stock = input.quantity;
        await current.save({ session });
      } else if (input.operation === "add") {
        change = input.quantity;
        await model.updateOne({ _id: id }, { $inc: { stock: input.quantity } }, { session });
      } else {
        // The `stock >= quantity` condition is part of the update, so two
        // people subtracting at the same moment cannot take stock below zero.
        const result = await model.updateOne(
          { _id: id, stock: { $gte: input.quantity } },
          { $inc: { stock: -input.quantity } },
          { session }
        );
        if (result.modifiedCount === 0) throw new AppError("Stock cannot be negative", 400);
        change = -input.quantity;
      }

      await InventoryLog.create(
        [
          {
            productId,
            variantId:   input.variantId,
            change,
            reason:      "manual_adjustment",
            note:        input.note || "",
            performedBy: userId,
          },
        ],
        { session }
      );

      const updated = await model.findById(id).session(session);
      newStock = updated.stock;
    });
  } finally {
    await session.endSession();
  }

  await clearProductCache([productId]);
  return newStock;
}

/** POST /products/admin/receive — add stock for many products at once (a supplier delivery). */
export async function receiveStock(input: ReceiveStockInput, userId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of input.items) {
        const { model, id } = await stockHolder(item.productId, item.variantId, session);
        const result = await model.updateOne({ _id: id }, { $inc: { stock: item.quantity } }, { session });
        if (result.matchedCount === 0) throw new AppError(`Product ${item.productId} not found`, 404);
      }

      await InventoryLog.insertMany(
        input.items.map((item) => ({
          productId:   item.productId,
          variantId:   item.variantId,
          change:      item.quantity,
          reason:      "restock" as const,
          note:        input.note || "Stock received",
          performedBy: userId,
        })),
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  await clearProductCache(input.items.map((i) => i.productId));
  return { received: input.items.length, units: input.items.reduce((sum, i) => sum + i.quantity, 0) };
}

// ── Stock history ─────────────────────────────────────────────────────────────

/** GET /products/admin/:id/logs — the 50 latest changes for one product. */
export function listProductLogs(productId: string) {
  return InventoryLog.find({ productId }).sort({ createdAt: -1 }).limit(50).populate("performedBy", "name").lean();
}

/** GET /products/admin/stock-logs — history across all products, newest first. */
export async function listStockLogs(query: StockLogsQuery) {
  const filter: Record<string, unknown> = {};
  if (query.productId) filter.productId = query.productId;
  if (query.reason) filter.reason = query.reason;

  const { skip, take } = paginate(query.page, query.limit);
  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .populate("productId", "name sku")
      .populate("variantId", "label")
      .populate("performedBy", "name")
      .lean(),
    InventoryLog.countDocuments(filter),
  ]);

  return { logs, total };
}
