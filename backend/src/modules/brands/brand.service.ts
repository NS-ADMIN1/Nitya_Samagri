// src/modules/brands/brand.service.ts
import { Brand } from "../../database/models/Brand";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";
import { BrandCreateInput } from "./brand.schema";

/** Active brands, A–Z — the public list used by the shop filters and the admin product form. */
export function listActiveBrands() {
  return Brand.find({ isActive: true }).sort({ name: 1 }).lean();
}

/** Create a brand; the slug is generated from the name. */
export async function createBrand(input: BrandCreateInput) {
  const slug = slugify(input.name);
  if (!slug) throw new AppError("Brand name must include English letters or numbers", 400);

  const existing = await Brand.findOne({ slug });
  if (existing) throw new AppError("A brand with this name already exists", 409);

  return Brand.create({ name: input.name, slug, logoUrl: input.logoUrl });
}
