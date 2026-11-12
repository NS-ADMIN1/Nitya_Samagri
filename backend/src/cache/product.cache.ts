// src/cache/product.cache.ts
import { Types } from "mongoose";
import { Product } from "../database/models/Product";
import { redis, cacheDelPattern } from "../config/redis";
import { logger } from "../utils/logger";
import { cacheKeys } from "./cache.keys";

/**
 * Drop the cached product lists and the cached pages of the given products.
 * Call it after anything customers can see has changed: stock, price,
 * details, photos, reviews. Never throws — a cache problem must not fail
 * the request that changed the data.
 *
 * `extraSlugs` is for a product whose slug has just changed: the old slug's
 * page is cached under the old name.
 */
export async function clearProductCache(
  productIds: Array<Types.ObjectId | string>,
  extraSlugs: string[] = []
): Promise<void> {
  if (productIds.length === 0 && extraSlugs.length === 0) return;
  try {
    const products = await Product.find({ _id: { $in: productIds } }).select("slug").lean();
    const slugs = [...products.map((p) => p.slug), ...extraSlugs];
    await Promise.all([
      cacheDelPattern(cacheKeys.productsListPattern()),
      ...slugs.map((slug) => redis.del(cacheKeys.productBySlug(slug))),
    ]);
  } catch (err) {
    logger.warn("Could not clear the product cache", { err });
  }
}
