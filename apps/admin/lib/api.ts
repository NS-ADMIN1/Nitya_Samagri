// apps/admin/lib/api.ts
// Same pattern as the fetch wrapper in apps/web — separate copy since the two
// apps are independent Next.js projects (no shared package in this repo).

import { getAdminSession, setAdminSession, clearAdminSession } from "./adminAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, skipRefresh = false, headers, ...rest } = options;
  const session = auth ? getAdminSession() : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && auth && session?.refreshToken && !skipRefresh) {
    const refreshed = await tryRefresh(session.refreshToken);
    if (refreshed) return request<T>(path, { ...options, skipRefresh: true });
    clearAdminSession();
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Prefer the field-level validation errors (e.g. "categoryId: Invalid ID")
    // over the generic top-level "Validation failed" message, so the UI can
    // actually tell the person what to fix.
    const detail = Array.isArray(body?.errors) && body.errors.length
      ? body.errors.map((e: { field?: string; message: string }) => (e.field ? `${e.field}: ${e.message}` : e.message)).join("; ")
      : undefined;
    throw new ApiError(detail || body?.message || "Something went wrong", res.status);
  }

  return body as T;
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    setAdminSession({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
};