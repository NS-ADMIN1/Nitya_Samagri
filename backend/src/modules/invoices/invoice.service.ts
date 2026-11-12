// src/modules/invoices/invoice.service.ts
//
// The GST invoice for an order. The invoice number is given the first time
// the invoice is opened and never changes after that. Numbers run in one
// series per financial year: NS/2026-27/000001, NS/2026-27/000002, …
import { Order, IOrder } from "../../database/models/Order";
import { OrderItem } from "../../database/models/OrderItem";
import { Product } from "../../database/models/Product";
import { Address } from "../../database/models/Address";
import { Counter } from "../../database/models/Counter";
import { AppError } from "../../utils/AppError";
import { ORDER_STAFF_ROLES } from "../orders/order.rules";
import { getSettings } from "../settings/settings.service";
import { financialYear, formatInvoiceNo, invoiceLine, invoiceTotals, isSameState } from "./invoice.rules";

const PAYMENT_METHOD: Record<string, string> = {
  cod: "Cash on delivery", razorpay: "Online", upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet",
};
const PAYMENT_STATUS: Record<string, string> = {
  pending: "Due", paid: "Paid", failed: "Due", refunded: "Refunded", partially_refunded: "Partly refunded",
};

const joinAddress = (parts: Array<string | undefined>) => parts.filter(Boolean).join(", ");

/**
 * Give the order its invoice number if it has none yet. Both steps are
 * single atomic updates, so two people opening the same invoice at the same
 * moment end up with the same number.
 */
async function ensureInvoiceNo(order: IOrder, prefix: string): Promise<{ invoiceNo: string; invoiceDate: Date }> {
  if (order.invoiceNo && order.invoiceDate) return { invoiceNo: order.invoiceNo, invoiceDate: order.invoiceDate };

  const invoiceDate = new Date();
  const year = financialYear(invoiceDate);
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice:${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const invoiceNo = formatInvoiceNo(prefix, year, counter!.seq);

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, invoiceNo: { $exists: false } },
    { $set: { invoiceNo, invoiceDate } },
    { new: true }
  );
  if (claimed) return { invoiceNo, invoiceDate };

  // Someone else numbered it a moment ago — use theirs.
  const current = await Order.findById(order._id).select("invoiceNo invoiceDate");
  return { invoiceNo: current!.invoiceNo!, invoiceDate: current!.invoiceDate! };
}

/** Everything printed on the invoice. Customers can only open invoices for their own orders. */
export async function getInvoice(orderId: string, viewer: { userId: string; role: string }) {
  const filter: Record<string, unknown> = { orderId };
  if (!ORDER_STAFF_ROLES.includes(viewer.role)) filter.userId = viewer.userId;

  const order = await Order.findOne(filter);
  if (!order) throw new AppError("Order not found", 404);
  if (order.status === "pending" || order.status === "cancelled") {
    throw new AppError("An invoice is available once the order is confirmed", 400);
  }

  const settings = await getSettings();
  if (!settings.gstin || !settings.address?.line1 || !settings.address?.state) {
    throw new AppError("Add the store's GSTIN and business address in Settings before creating invoices", 400);
  }

  const { invoiceNo, invoiceDate } = await ensureInvoiceNo(order, settings.invoicePrefix || "NS");

  const [items, savedAddress] = await Promise.all([
    OrderItem.find({ orderId: order._id }).lean(),
    Address.findById(order.addressId).select("phone").lean(),
  ]);
  const products = await Product.find({ _id: { $in: items.map((i) => i.productId) } }).select("hsnCode").lean();
  const hsnByProduct = new Map(products.map((p) => [String(p._id), p.hsnCode || ""]));

  const sameState = isSameState(settings.address.state, order.address.state);
  const lines = items.map((item) =>
    invoiceLine(
      {
        name:   item.productName,
        sku:    item.sku,
        hsn:    hsnByProduct.get(String(item.productId)) || "",
        qty:    item.qty,
        price:  item.price,
        gstPct: item.gstPct,
      },
      sameState
    )
  );

  return {
    invoiceNo,
    invoiceDate: invoiceDate.toISOString().slice(0, 10),
    orderId:     order.orderId,
    sameState,
    seller: {
      name:        settings.legalName || settings.storeName,
      gstin:       settings.gstin,
      addressLine: joinAddress([settings.address.line1, settings.address.line2, settings.address.city, settings.address.state, settings.address.pincode]),
      state:       settings.address.state,
      phone:       settings.supportPhone || "",
      email:       settings.supportEmail || "",
    },
    buyer: {
      name:        order.address.name,
      addressLine: joinAddress([order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pin]),
      state:       order.address.state,
      phone:       savedAddress?.phone || "",
    },
    payment: {
      method: PAYMENT_METHOD[order.paymentMethod || ""] || "—",
      status: PAYMENT_STATUS[order.paymentStatus] || order.paymentStatus,
    },
    lines,
    totals: invoiceTotals(lines, { shipping: order.shipping, discount: order.discount || 0, total: order.total }),
  };
}

export type Invoice = Awaited<ReturnType<typeof getInvoice>>;
