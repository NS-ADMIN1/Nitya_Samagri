"use client";

// apps/admin/components/layout/RequireAuth.tsx
// Wrap any admin page's returned JSX in <RequireAuth> to gate it behind login
// (AdminShell already does this for every page that uses it). Redirects to
// /login if no session is found. The session is only checked for presence
// here; the API verifies the token on every request.

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthed } from "../../lib/adminAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // "checking" | "authed" | "redirecting"

  useEffect(() => {
    if (isAdminAuthed()) {
      setStatus("authed");
    } else {
      setStatus("redirecting");
      router.replace("/login");
    }
  }, [router]);

  if (status !== "authed") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-offwhite font-sans text-sm text-slate">
        {status === "checking" ? "Checking your sign-in…" : "Taking you to the sign-in page…"}
      </div>
    );
  }

  return children;
}
