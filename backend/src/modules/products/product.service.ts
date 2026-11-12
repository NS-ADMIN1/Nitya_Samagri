// src/modules/products/product.service.ts
//
// The product catalogue: the public shop listing and product page, and the
// admin's create / edit / archive. Stock changes are the inventory module.
//
// A product's pack sizes (variants) and photos live in their own
// collections; attachDetails() adds them — and the review rating — to
// products before they are sent out.
import { Types } from "mongoose";
import { Product } from "../../database/models/Product";
import { ProductVariant } from "../../database/models/ProductVariant";
import { ProductImage } from "../../database/models/ProductImage";
import { Review } from "../../database/models/Review";
import { Brand } from "../../database/models/Brand";
import { OrderItem } from "../../database/models/OrderItem";
import { redis } from "../../config/redis";
import { cacheKeys } from "../../cache/cache.keys";
import { clearProductCache } from "../../cache/product.cache";
import { AppError } from "../../utils/AppError";
import { paginate } from "../../utils/paginate";
import { slugify } from "../../utils/slugify";
import {
  AdminProductQuery,
  ImageInput,
  ProductCreateInput,
  ProductQuery,
  ProductUpdateInput,
  VariantInput,
} from "./product.schema";

const CACHE_TTL = 300; // seconds
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const idList = (csv: string) => csv.split(",").map((s) => s.trim()).filter((s) => OBJECT_ID.test(s));

// ── Shared ────────────────────────────────────────────────────────────────────

function groupBy<T>(rows: T[], key: (row: T) => unknown): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = String(key(row));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(row);
  }
  return groups;
}

/**
 * Add to each product: `variants`, `images` (in display order), `imageUrl`
 * (the main photo, or null), and `rating` / `reviewCount` from approved
 * reviews. Three queries for the whole page, however many products.
 */
async function attachDetails<T extends { _id: unknown }>(products: T[]) {
  const ids = products.map((p) => p._id as Types.ObjectId);

  const [variants, images, ratings] = await Promise.all([
    ProductVariant.find({ productId: { $in: ids } }).lean(),
    ProductImage.find({ productId: { $in: ids } }).sort({ sortOrder: 1 }).lean(),
    Review.aggregate([
      { $match: { productId: { $in: ids }, isApproved: true } },
      { $group: { _id: "$productId", rating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]),
  ]);

  const variantsByProduct = groupBy(variants, (v) => v.productId);
  const imagesByProduct   = groupBy(images, (i) => i.productId);
  const ratingByProduct   = new Map(ratings.map((r) => [String(r._id), r]));

  return products.map((p) => {
    const key      = String(p._id);
    const photos   = imagesByProduct.get(key) || [];
    const rating   = ratingByProduct.get(key);
    return {
      ...p,
      variants:    variantsByProduct.get(key) || [],
      images:      photos,
      imageUrl:    (photos.find((i) => i.isPrimary) || photos[0])?.url || null,
      rating:      rating ? Math.round(rating.rating * 10) / 10 : null,
      reviewCount: rating ? (rating.reviewCount as number) : 0,
    };
  });
}

// ── Public shop ───────────────────────────────────────────────────────────────

/** The shop listing: active products with search, filters and paging. Cached for 5 minutes. */
export async function listProducts(q: ProductQuery) {
  const cacheKey = cacheKeys.productsList(JSON.stringify(q));
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const filter: Record<string, unknown> = { status: "active" };
  if (q.q) filter.$text = { $search: q.q }; // text index on name / description / tags
  if (q.categoryId) filter.categoryId = q.categoryId;

  // `ids` and `size` both narrow by product ID — a product must satisfy both.
  let allowedIds: string[] | null = null;
  if (q.ids) allowedIds = idList(q.ids);
  if (q.size) {
    const labels = q.size.split(",").map((s) => s.trim()).filter(Boolean);
    const withSize = (await ProductVariant.distinct("productId", { label: { $in: labels }, isActive: true })).map(String);
    allowedIds = allowedIds ? allowedIds.filter((id) => withSize.includes(id)) : withSize;
  }
  if (allowedIds) filter._id = { $in: allowedIds };

  if (q.brandId) filter.brandId = { $in: idList(q.brandId) };
  if (q.onSale) filter.$expr = { $gt: ["$mrp", "$price"] };
  if (q.inStock) filter.stock = { $gt: 0 };
  if (q.isFeatured) filter.isFeatured = true;
  if (q.minPrice || q.maxPrice) {
    const price: Record<string, number> = {};
    if (q.minPrice) price.$gte = q.minPrice;
    if (q.maxPrice) price.$lte = q.maxPrice;
    filter.price = price;
  }

  const { skip, take } = paginate(q.page, q.limit);
  const sort: Record<string, 1 | -1> = { [q.sortBy]: q.sortOrder === "asc" ? 1 : -1 };

  const [products, total] = await Promise.all([
    Product.find(filter).populate("categoryId", "name").populate("brandId", "name").sort(sort).skip(skip).limit(take).lean(),
    Product.countDocuments(filter),
  ]);

  const result = {
    success: true,
    data: {
      products:   await attachDetails(products),
      pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) },
    },
  };

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}

/** What the shop sidebar can filter by: brands, pack sizes (with counts) and the price range. */
export async function getFacets() {
  const activeIds = await Product.distinct("_id", { status: "active" });

  const [brandCounts, sizeCounts, priceRange] = await Promise.all([
    Product.aggregate([
      { $match: { status: "active", brandId: { $ne: null } } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]),
    ProductVariant.aggregate([
      { $match: { productId: { $in: activeIds }, isActive: true } },
      { $group: { _id: "$label", products: { $addToSet: "$productId" } } },
      { $project: { _id: 1, count: { $size: "$products" } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Product.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
    ]),
  ]);

  const brandDocs = await Brand.find({ _id: { $in: brandCounts.map((b) => b._id) }, isActive: true }).lean();
  const countByBrand = new Map(brandCounts.map((b) => [String(b._id), b.count as number]));

  return {
    brands: brandDocs
      .map((b) => ({ _id: b._id, name: b.name, count: countByBrand.get(String(b._id)) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    sizes: sizeCounts.map((s) => ({ label: s._id, count: s.count })),
    price: { min: Math.floor(priceRange[0]?.min ?? 0), max: Math.ceil(priceRange[0]?.max ?? 0) },
  };
}

/** One active product by slug, with its latest reviews and related products. Cached for 5 minutes. */
export async function getProductBySlug(slug: string) {
  const cacheKey = cacheKeys.productBySlug(slug);
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const product = await Product.findOne({ slug, status: "active" }).populate("categoryId", "name slug").lean();
  if (!product) throw new AppError("Product not found", 404);

  const [[detailed], reviews, relatedProducts] = await Promise.all([
    attachDetails([product]),
    Review.find({ productId: product._id, isApproved: true }).sort({ createdAt: -1 }).limit(10).populate("userId", "name").lean(),
    Product.find({ categoryId: product.categoryId, status: "active", _id: { $ne: product._id } })
      .select("name slug price mrp stock")
      .limit(6)
      .lean(),
  ]);

  const related = (await attachDetails(relatedProducts)).map(
    ({ variants: _variants, images: _images, ...rest }) => rest // related cards only need the main photo
  );

  const result = { success: true, data: { product: { ...detailed, reviews }, related } };
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  return result;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

const LOW_STOCK = { $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockAt"] }] } };

/** Every product in any status, with stock filters and the counts shown on the admin Products / Inventory pages. */
export async function listAllProducts(q: AdminProductQuery) {
  const filter: Record<string, unknown> = {};
  if (q.status !== "all") filter.status = q.status;
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.q) filter.$text = { $search: q.q };
  if (q.stockFilter === "out") filter.stock = 0;
  if (q.stockFilter === "in") filter.stock = { $gt: 0 };
  if (q.stockFilter === "low") Object.assign(filter, LOW_STOCK);

  const { skip, take } = paginate(q.page, q.limit);
  const sort: Record<string, 1 | -1> = { [q.sortBy]: q.sortOrder === "asc" ? 1 : -1 };

  const [products, total, byStatus, lowStockCount, outOfStockCount, allCount] = await Promise.all([
    Product.find(filter).populate("categoryId", "name").populate("brandId", "name").sort(sort).skip(skip).limit(take).lean(),
    Product.countDocuments(filter),
    Product.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Product.countDocuments(LOW_STOCK),
    Product.countDocuments({ stock: 0 }),
    Product.countDocuments(),
  ]);

  const statusCounts: Record<string, number> = { draft: 0, active: 0, archived: 0 };
  for (const s of byStatus) if (s._id) statusCounts[s._id as string] = s.count;

  return {
    products: await attachDetails(products),
    total,
    stats: { total: allCount, byStatus: statusCounts, lowStockCount, outOfStockCount },
  };
}

/** Replace a product's photos with the given list; the first is the main photo. */
async function replaceImages(productId: Types.ObjectId, images: ImageInput[]) {
  await ProductImage.deleteMany({ productId });
  if (images.length === 0) return;
  await ProductImage.insertMany(
    images.map((img, i) => ({ productId, url: img.url, altText: img.altText, sortOrder: i, isPrimary: i === 0 }))
  );
}

/**
 * Make a product's variants match the given list:
 *   - an entry with `_id` updates that variant (its stock is left alone —
 *     stock changes go through Inventory so each one is logged)
 *   - an entry without `_id` is a new variant
 *   - a variant missing from the list is removed; if an order ever used it,
 *     it is switched off instead, so past orders still show it
 */
async function syncVariants(productId: Types.ObjectId, variants: VariantInput[]) {
  const existing = await ProductVariant.find({ productId });
  const keptIds = new Set(variants.filter((v) => v._id).map((v) => v._id as string));

  for (const variant of existing) {
    if (keptIds.has(String(variant._id))) continue;
    if (await OrderItem.exists({ variantId: variant._id })) {
      variant.isActive = false;
      await variant.save();
    } else {
      await variant.deleteOne();
    }
  }

  for (const input of variants) {
    const { _id, stock, ...fields } = input;
    if (_id) {
      const updated = await ProductVariant.findOneAndUpdate({ _id, productId }, fields, { runValidators: true });
      if (!updated) throw new AppError(`Variant "${input.label}" does not belong to this product`, 400);
    } else {
      await ProductVariant.create({ ...fields, stock, productId });
    }
  }
}

async function getDetailed(productId: Types.ObjectId) {
  const product = await Product.findById(productId).populate("categoryId", "name").populate("brandId", "name").lean();
  if (!product) throw new AppError("Product not found", 404);
  const [detailed] = await attachDetails([product]);
  return detailed;
}

export async function createProduct(input: ProductCreateInput) {
  const { variants, images, ...fields } = input;

  const slug = fields.slug || slugify(fields.name);
  if (!slug) throw new AppError("Give this product a URL slug in English letters or numbers", 400);
  if (await Product.exists({ slug })) throw new AppError("A product with this slug already exists", 409);

  const product = await Product.create({ ...fields, slug });
  const productId = product._id as Types.ObjectId;

  try {
    if (variants?.length) await syncVariants(productId, variants);
    if (images?.length) await replaceImages(productId, images);
  } catch (err) {
    // Don't leave a half-made product behind (e.g. a variant SKU that is already taken)
    await Promise.all([
      ProductVariant.deleteMany({ productId }),
      ProductImage.deleteMany({ productId }),
      product.deleteOne(),
    ]);
    throw err;
  }

  await clearProductCache([productId]);
  return getDetailed(productId);
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  const { variants, images, ...fields } = input;

  const product = await Product.findById(id);
  if (!product) throw new AppError("Product not found", 404);

  const previousSlug = product.slug;
  if (fields.slug && fields.slug !== previousSlug && (await Product.exists({ slug: fields.slug, _id: { $ne: product._id } }))) {
    throw new AppError("A product with this slug already exists", 409);
  }

  Object.assign(product, fields);
  await product.save();

  const productId = product._id as Types.ObjectId;
  if (variants) await syncVariants(productId, variants);
  if (images) await replaceImages(productId, images);

  await clearProductCache([productId], [previousSlug]);
  return getDetailed(productId);
}

/** "Delete" archives the product: it leaves the shop but past orders keep working. */
export async function archiveProduct(id: string) {
  const product = await Product.findByIdAndUpdate(id, { status: "archived" });
  if (!product) throw new AppError("Product not found", 404);
  await clearProductCache([product._id as Types.ObjectId]);
}
