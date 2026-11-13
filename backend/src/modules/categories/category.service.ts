// src/modules/categories/category.service.ts
import { Category } from "../../database/models/Category";
import { Product } from "../../database/models/Product";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";
import { CategoryCreateInput, CategoryUpdateInput } from "./category.schema";

/**
 * Active categories, each with a live count of its active products. The
 * counts come from one aggregation rather than a query per category.
 */
export async function listActiveCategories(): Promise<object[]> { // plain `object`: see the note in auth.service.ts getProfile
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]),
  ]);

  const countByCategory = new Map(counts.map((c) => [String(c._id), c.count as number]));
  return categories.map((c) => ({ ...c, productCount: countByCategory.get(String(c._id)) || 0 }));
}

/** One active category by slug — the /category/[slug] page header. */
export async function getActiveCategoryBySlug(slug: string) {
  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) throw new AppError("Category not found", 404);
  return category;
}

/** Create a category; the slug is generated from the name. */
export async function createCategory(input: CategoryCreateInput) {
  const slug = slugify(input.name);
  if (!slug) throw new AppError("Category name must include English letters or numbers", 400);

  const existing = await Category.findOne({ slug });
  if (existing) throw new AppError("A category with this name already exists", 409);

  return Category.create({
    name:        input.name,
    slug,
    description: input.description,
    imageUrl:    input.imageUrl,
    parentId:    input.parentId || null,
  });
}

/** Edit a category. A name change keeps the existing slug, so links don't break. */
export async function updateCategory(id: string, input: CategoryUpdateInput) {
  const changes: CategoryUpdateInput = {};
  if (input.name)                      changes.name        = input.name;
  if (input.description !== undefined) changes.description = input.description;
  if (input.imageUrl !== undefined)    changes.imageUrl    = input.imageUrl;
  if (input.isActive !== undefined)    changes.isActive    = input.isActive;
  if (input.sortOrder !== undefined)   changes.sortOrder   = input.sortOrder;

  const category = await Category.findByIdAndUpdate(id, changes, { new: true });
  if (!category) throw new AppError("Category not found", 404);
  return category;
}