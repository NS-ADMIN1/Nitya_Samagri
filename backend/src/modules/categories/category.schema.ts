// src/modules/categories/category.schema.ts
import { z } from "zod";
import { objectId } from "../../utils/validators";

export const CategoryCreateSchema = z.object({
  name:        z.string({ required_error: "Category name is required" }).trim().min(2, "Category name is required").max(80),
  description: z.string().max(1000).optional(),
  imageUrl:    z.string().max(500).optional(),
  // "" and null both mean "top-level category"
  parentId:    z.union([objectId(), z.literal(""), z.null()]).optional(),
});

export const CategoryUpdateSchema = z.object({
  name:        z.string().trim().min(2).max(80).optional(),
  description: z.string().max(1000).optional(),
  imageUrl:    z.string().max(500).optional(),
  isActive:    z.boolean().optional(),
  sortOrder:   z.number().int().optional(),
});

export type CategoryCreateInput = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
