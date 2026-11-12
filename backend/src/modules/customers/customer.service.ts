// src/modules/customers/customer.service.ts
//
// The admin panel's view of customers: list them, block or unblock one.
import { User } from "../../database/models/User";
import { Order } from "../../database/models/Order";
import { AppError } from "../../utils/AppError";
import { paginate } from "../../utils/paginate";
import { escapeRegex } from "../../utils/escapeRegex";
import { revokeSessions } from "../auth/auth.service";
import { CustomerListQuery } from "./customer.schema";

/** One page of customers, each with their paid-order count, spend and last order date. */
export async function listCustomers(query: CustomerListQuery) {
  const filter: Record<string, unknown> = { role: "customer" };
  if (query.q) {
    const text = escapeRegex(query.q.trim());
    filter.$or = [
      { name: { $regex: text, $options: "i" } },
      { phone: { $regex: text } },
      { email: { $regex: text, $options: "i" } },
    ];
  }

  const { skip, take } = paginate(query.page, query.limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name phone email status loyaltyPoints loyaltyTier createdAt lastLoginAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    User.countDocuments(filter),
  ]);

  const orderStats = await Order.aggregate([
    { $match: { userId: { $in: users.map((u) => u._id) }, paymentStatus: "paid" } },
    { $group: { _id: "$userId", orders: { $sum: 1 }, spend: { $sum: "$total" }, lastOrder: { $max: "$createdAt" } } },
  ]);
  const statsByUser = new Map(orderStats.map((s) => [String(s._id), s]));

  const customers = users.map((u) => {
    const stats = statsByUser.get(String(u._id));
    return { ...u, orders: stats?.orders || 0, spend: stats?.spend || 0, lastOrder: stats?.lastOrder || null };
  });

  return { users: customers, total };
}

/** Block or unblock a customer. Blocking also signs them out. */
export async function setCustomerStatus(customerId: string, status: "active" | "blocked") {
  const customer = await User.findOne({ _id: customerId, role: "customer" });
  if (!customer) throw new AppError("Customer not found", 404);

  customer.status = status;
  await customer.save();
  if (status === "blocked") await revokeSessions(String(customer._id));

  return { id: customer._id, name: customer.name, phone: customer.phone, status: customer.status };
}
