// src/modules/customers/customer.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import { CustomerListQuery } from "./customer.schema";
import * as customerService from "./customer.service";

// GET /api/v1/auth/admin/users?page=&limit=&q=
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as CustomerListQuery;
  const { users, total } = await customerService.listCustomers(query);
  res.json({
    success: true,
    data: { users, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } },
  });
});

// PATCH /api/v1/auth/admin/users/:id/status
export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.setCustomerStatus(req.params.id, req.body.status);
  res.json({ success: true, data: { customer } });
});
