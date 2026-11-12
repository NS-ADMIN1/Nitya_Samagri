// src/utils/escapeRegex.ts

/** Make user-typed text safe to use inside a MongoDB $regex search. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
