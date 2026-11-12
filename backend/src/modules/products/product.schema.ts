// src/modules/products/product.schema.ts
import { z } from "zod";
import { objectId, pageQuery } from "../../utils/validators";

/** "?inStock=true" → true. (z.coerce.boolean() would read "false" as true.) */
const queryFlag = () =>
  z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1").optional();

const ImageSchema = z.object({
  url:     z.string().url().max(1000),
  altText: z.string().max(200).optional(),
});

// A pack size / option of a product. `_id` is sent when editing an existing one.
const VariantSchema = z.object({
  _id:      objectId().optional(),
  label:    z.string().min(1).max(60),
  sku:      z.string().min(1).max(50),
  price:    z.number().positive(),
  mrp:      z.number().positive(),
  stock:    z.number().int().min(0).default(0), // used for a NEW variant only — later changes go through Inventory
  weight:   z.number().positive().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

const ProductFields = z.object({
  name:        z.string().min(2).max(200),
  slug:        z.string().regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  shortDesc:   z.string().max(300).optional(),
  categoryId:  objectId(),
  brandId:     objectId().optional(),
  mrp:         z.number().positive(),
  price:       z.number().positive(),
  costPrice:   z.number().positive().optional(),
  gstPct:      z.number().min(0).max(28).default(5),
  hsnCode:     z.string().optional(),
  sku:         z.string().min(3).max(50),
  stock:       z.number().int().min(0).default(0),
  lowStockAt:  z.number().int().min(0).default(10),
  weight:      z.number().positive().optional(),
  tags:        z.array(z.string()).optional(),
  isFeatured:  z.boolean().default(false),
  status:      z.enum(["draft", "active", "archived"]).default("draft"),
  variants:    z.array(VariantSchema).max(30).optional(),
  // Photos in display order — the first one is the main photo.
  images:      z.array(ImageSchema).max(10).optional(),
});

const priceNotAboveMrp = (d: { price?: number; mrp?: number }) =>
  d.price === undefined || d.mrp === undefined || d.price <= d.mrp;
const priceIssue = { message: "Selling price cannot be more than the MRP", path: ["price"] };

export const ProductCreateSchema = ProductFields.refine(priceNotAboveMrp, priceIssue);
export const ProductUpdateSchema = ProductFields.partial().refine(priceNotAboveMrp, priceIssue);

// Public shop listing — always active products only
export const ProductQuerySchema = z.object({
  ...pageQuery(100, 20),
  q:          z.string().optional(),
  categoryId: objectId().optional(),
  ids:        z.string().optional(), // comma-separated product IDs (festival pages)
  brandId:    z.string().optional(), // comma-separated brand IDs
  size:       z.string().optional(), // comma-separated variant labels, e.g. "500g,1kg"
  onSale:     queryFlag(),
  minPrice:   z.coerce.number().optional(),
  maxPrice:   z.coerce.number().optional(),
  inStock:    queryFlag(),
  isFeatured: queryFlag(),
  sortBy:     z.enum(["price", "createdAt", "name", "stock", "sold"]).default("createdAt"),
  sortOrder:  z.enum(["asc", "desc"]).default("desc"),
});

// Admin listing — every status, plus stock filters
export const AdminProductQuerySchema = z.object({
  ...pageQuery(100, 20),
  q:           z.string().optional(),
  categoryId:  objectId().optional(),
  status:      z.enum(["draft", "active", "archived", "all"]).default("all"),
  stockFilter: z.enum(["all", "low", "out", "in"]).default("all"),
  sortBy:      z.enum(["price", "createdAt", "name", "stock", "sold"]).default("createdAt"),
  sortOrder:   z.enum(["asc", "desc"]).default("desc"),
});

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductQuery       = z.infer<typeof ProductQuerySchema>;
export type AdminProductQuery  = z.infer<typeof AdminProductQuerySchema>;
export type VariantInput       = z.infer<typeof VariantSchema>;
export type ImageInput         = z.infer<typeof ImageSchema>;
