// src/utils/slugify.ts

/** "Pooja Thali (Brass)" → "pooja-thali-brass" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
