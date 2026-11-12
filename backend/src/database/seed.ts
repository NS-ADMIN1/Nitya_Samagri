// src/database/seed.ts
//
// Minimal dev-only seed data — one super admin user, one category, one product —
// enough to log in and see something in the storefront locally.
// Run with: npm run seed  (see package.json)

import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { User } from "./models/User";
import { Category } from "./models/Category";
import { Product } from "./models/Product";
import { logger } from "../utils/logger";

async function seed() {
  await connectDatabase();

  const adminPhone = "+919936336675";
  const existingAdmin = await User.findOne({ phone: adminPhone });
  if (!existingAdmin) {
    await User.create({
      name: "Admin",
      phone: adminPhone,
      email: "admin@adminns.in",
      password: await bcrypt.hash("changeme123", 12),
      role: "super_admin",
      isVerified: true,
    });
    logger.info(`Seeded admin user (phone: ${adminPhone})`);
  }

  let category = await Category.findOne({ slug: "puja-samagri" });
  if (!category) {
    category = await Category.create({ name: "Puja Samagri", slug: "puja-samagri" });
    logger.info("Seeded category: puja-samagri");
  }

  const existingProduct = await Product.findOne({ sku: "PS-DEMO-001" });
  if (!existingProduct) {
    await Product.create({
      name: "Demo Puja Thali Set",
      slug: "demo-puja-thali-set",
      shortDesc: "Complete puja thali with all essentials",
      categoryId: category._id,
      mrp: 999,
      price: 799,
      sku: "PS-DEMO-001",
      stock: 50,
      status: "active",
    });
    logger.info("Seeded product: demo-puja-thali-set");
  }

  logger.info("✅ Seed complete");
  await disconnectDatabase();
}

seed().catch((err) => {
  logger.error("Seed failed", { err });
  process.exit(1);
});