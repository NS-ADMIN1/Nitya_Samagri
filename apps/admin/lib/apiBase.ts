// apps/admin/lib/apiBase.ts
//
// One place that works out the backend address, so login (adminAuth.ts) and
// every other call (api.ts) agree on it.
//
// NEXT_PUBLIC_API_URL is set differently per environment — with the
// "/api/v1" suffix on the live build (https://api.adminns.in/api/v1) and
// without it in .env.example / staging. Both are accepted: the suffix is
// stripped here and added back exactly once.

const API_PREFIX = "/api/v1";

const configured = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").trim();

/** Backend origin with no trailing slash and no "/api/v1", e.g. https://api.adminns.in */
export const API_ROOT = configured.replace(/\/+$/, "").replace(/\/api\/v1$/i, "");

/**
 * Full address for an API path. Accepts the path with or without the
 * "/api/v1" prefix — "/api/v1/brands" and "/brands" give the same address.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const hasPrefix = p === API_PREFIX || p.startsWith(`${API_PREFIX}/`) || p.startsWith(`${API_PREFIX}?`);
  return `${API_ROOT}${hasPrefix ? p : `${API_PREFIX}${p}`}`;
}
