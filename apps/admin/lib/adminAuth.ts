// apps/admin/lib/adminAuth.ts
//
// Real admin session handling, wired to POST /api/v1/auth/login. Staff log
// in with an @adminns.in email (not phone — that's the customer flow on
// apps/web). The backend restricts email-based login to staff roles
// (admin/super_admin/order_manager/warehouse/support) and rejects anyone
// else, so there's no separate "is this an admin" check needed here beyond
// what the API already enforces.

import { apiUrl } from "./apiBase";

const SESSION_KEY = "nitya_admin_session";

export interface AdminUser {
  id: string;
  name: string;
  email?: string;
  role: string;
}

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  user?: AdminUser;
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminSession(session: Partial<AdminSession>): void {
  if (typeof window === "undefined") return;
  const existing = getAdminSession();
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, ...session }));
}

export function isAdminAuthed(): boolean {
  return !!getAdminSession()?.accessToken;
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

/**
 * Real login — email must end in @adminns.in (enforced server-side too).
 * Throws with a user-facing message on failure.
 */
export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  if (!email.toLowerCase().endsWith("@adminns.in")) {
    throw new Error("Staff login requires an @adminns.in email address.");
  }

  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body?.message || body?.errors?.[0]?.message || "Invalid email or password.");
  }

  const session: AdminSession = {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    user: body.data.user,
  };
  setAdminSession(session);
  return session;
}