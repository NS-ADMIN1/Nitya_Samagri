// src/modules/media/media.schema.ts
import { z } from "zod";

/** Photo types that may be uploaded, and the file ending each is saved with. */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

/** What the photo is for — it becomes the folder inside the bucket. */
export const MEDIA_FOLDERS = ["products", "categories", "brands", "banners", "festivals", "blog"] as const;

export const UploadUrlSchema = z.object({
  folder:      z.enum(MEDIA_FOLDERS).default("products"),
  contentType: z.string().refine((t) => t in IMAGE_TYPES, { message: "Upload a JPG, PNG or WebP image" }),
});

export type UploadUrlInput = z.infer<typeof UploadUrlSchema>;
