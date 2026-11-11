"use client";

// apps/admin/app/login/page.tsx
//
// Staff sign-in: @adminns.in email + password, checked by POST /auth/login
// (see lib/adminAuth.ts). Already signed-in staff go straight to the
// dashboard.

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import Notice from "../../components/ui/Notice";
import { BRAND } from "../../lib/theme";
import { adminLogin, isAdminAuthed } from "../../lib/adminAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If a session already exists, skip straight to the dashboard.
  useEffect(() => {
    if (isAdminAuthed()) router.replace("/dashboard");
  }, [router]);

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Enter your staff email.");
    if (!email.toLowerCase().trim().endsWith("@adminns.in")) return setError("Staff sign-in needs an email ending in @adminns.in.");
    if (password.length < 6) return setError("Enter your password (at least 6 characters).");

    setLoading(true);
    try {
      await adminLogin(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-offwhite font-sans text-navy lg:flex-row">
      {/* Brand panel */}
      <div className="flex flex-col justify-between gap-10 bg-navy px-6 py-8 text-white sm:px-14 sm:py-14 lg:min-h-screen lg:flex-1">
        <div className="flex items-center gap-3.5">
          <span className="flex rounded-xl bg-white px-2.5 py-2">
            <Image src={BRAND.logoMark} alt={BRAND.name} width={249} height={157} className="h-[34px] w-auto" priority />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-[0.02em] text-white">{BRAND.name}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gold">{BRAND.panel}</span>
          </span>
        </div>
        <div className="hidden lg:block">
          <div className="mb-6 h-[3px] w-12 rounded bg-gold" />
          <p className="max-w-[460px] text-[34px] font-semibold leading-tight tracking-[-0.02em] text-white">{BRAND.tagline}.</p>
          <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-[#C5CEDF]">Orders, stock, products and offers for the {BRAND.name} team, in one simple workspace.</p>
        </div>
        <p className="hidden text-[13px] text-[#A9B4CB] lg:block">Staff access only.</p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <form onSubmit={submit} className="flex w-full max-w-[400px] flex-col gap-5" noValidate>
          <div>
            <h1 className="font-sans text-[28px] font-bold tracking-[-0.02em] text-navy">Sign in</h1>
            <p className="mt-1.5 text-sm text-slate">Use your staff email ending in @adminns.in</p>
          </div>

          <Field id="login-email" label="Staff email">
            <Input id="login-email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@adminns.in" />
          </Field>
          <Field id="login-password" label="Password">
            <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
          </Field>

          {error && <Notice tone="error">{error}</Notice>}

          <Button type="submit" loading={loading} fullWidth>
            Sign in
          </Button>

          <p className="text-[13px] leading-relaxed text-slate">Forgot your password? Ask your Super Admin for help.</p>
        </form>
      </div>
    </div>
  );
}