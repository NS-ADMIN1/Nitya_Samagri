// src/modules/invoices/invoice.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { invoiceHtml } from "./invoice.template";
import * as invoiceService from "./invoice.service";

// GET /api/v1/orders/:orderId/invoice            → the invoice as data (JSON)
// GET /api/v1/orders/:orderId/invoice?format=html → a printable page
export const get = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoice(req.params.orderId, req.user!);

  if (req.query.format === "html") {
    res.type("html").send(invoiceHtml(invoice));
    return;
  }
  res.json({ success: true, data: { invoice } });
});
