"use client";

// apps/web/app/login/page.tsx — log in or create an account.
//
// Three real paths, all unchanged on the backend
// (backend/src/modules/auth/auth.routes.ts):
//   • Password login   POST /auth/login          { phone, password }
//   • OTP login        Firebase sends and checks the SMS code in the browser,
//                      then POST /auth/otp/verify { idToken }. This also
//                      creates the account for a number seen for the first time.
//   • Sign up          POST /auth/register, then logs straight in.
//
// After login the customer returns to where they came from:
//   /login?next=/cart  →  back to the cart.

import { Suspense, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { apiFetch, isLoggedIn, saveSession, toE164Phone } from "../../lib/auth";
import type { SessionUser } from "../../lib/auth";
import { sendFirebaseOtp } from "../../lib/firebase";
import { BRAND } from "../../lib/theme";
import OtpInput from "../../components/ui/OtpInput";

type Mode = "login" | "signup";
type Method = "password" | "otp";
type AuthData = { data: { user: SessionUser; accessToken: string; refreshToken: string } };

const RECAPTCHA_CONTAINER_ID = "ns-login-recaptcha";
const RESEND_WAIT_SECONDS = 30;
const MIN_PASSWORD_LENGTH = 8; // RegisterSchema on the backend

// Only ever redirect to a page on this site.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) return "/";
  return raw;
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-slate">{hint}</p>}
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] flex-1 rounded text-sm font-semibold ${
        active ? "bg-navy text-white" : "text-navy hover:bg-mist"
      }`}
    >
      {children}
    </button>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("password");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Firebase's handle between "Send OTP" and "Verify" — its .confirm(code)
  // checks the code and returns the ID token the backend verifies.
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Already signed in: nothing to do here.
  useEffect(() => {
    if (isLoggedIn()) router.replace(next === "/" ? "/account" : next);
  }, [router, next]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const resetOtp = () => {
    setOtp("");
    setOtpSent(false);
    setResendIn(0);
    confirmationRef.current = null;
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    resetOtp();
  };

  const switchMethod = (nextMethod: Method) => {
    setMethod(nextMethod);
    setError("");
    setNotice("");
    resetOtp();
  };

  const finish = (data: AuthData["data"]) => {
    saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
    router.replace(next);
  };

  const sendOtp = async () => {
    const e164 = toE164Phone(phone);
    if (!e164) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      confirmationRef.current = await sendFirebaseOtp(e164, RECAPTCHA_CONTAINER_ID);
      setOtp("");
      setOtpSent(true);
      setResendIn(RESEND_WAIT_SECONDS);
    } catch {
      setError("We couldn't send the OTP. Please check the number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async (e164: string) => {
    const { ok, body } = await apiFetch<AuthData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: e164, password }),
    });
    if (!ok) throw new Error(body.message || "Incorrect mobile number or password.");
    finish(body.data);
  };

  const loginWithOtp = async () => {
    if (!confirmationRef.current) throw new Error("Please request a new OTP.");
    let idToken: string;
    try {
      const credential = await confirmationRef.current.confirm(otp);
      idToken = await credential.user.getIdToken();
    } catch {
      throw new Error("That OTP is incorrect or has expired. Please try again.");
    }
    const { ok, body } = await apiFetch<AuthData>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    if (!ok) throw new Error(body.message || "We couldn't verify the OTP. Please try again.");
    finish(body.data);
  };

  const signUp = async (e164: string) => {
    const { ok, body } = await apiFetch<{ message?: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), phone: e164, email: email.trim() || undefined, password }),
    });
    if (!ok) throw new Error(body.message || "We couldn't create your account. Please try again.");

    // /auth/register creates the account but returns no session, so log in
    // with the password that was just set.
    try {
      await loginWithPassword(e164);
    } catch {
      setMode("login");
      setMethod("password");
      setPassword("");
      setConfirmPassword("");
      setNotice("Your account is ready. Please log in.");
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");

    const e164 = toE164Phone(phone);
    if (!e164) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    if (mode === "signup") {
      if (name.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError("The two passwords don't match.");
        return;
      }
    } else if (method === "password") {
      if (!password) {
        setError("Enter your password.");
        return;
      }
    } else if (!otpSent || otp.length !== 6) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") await signUp(e164);
      else if (method === "password") await loginWithPassword(e164);
      else await loginWithOtp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const usingOtp = mode === "login" && method === "otp";
  const submitLabel = loading
    ? "Please wait…"
    : mode === "signup"
      ? "Create account"
      : usingOtp
        ? "Verify and log in"
        : "Log in";

  return (
    <div className="bg-offwhite">
      {/* Invisible reCAPTCHA anchor required by Firebase phone auth */}
      <div id={RECAPTCHA_CONTAINER_ID} />

      <div className="site-container flex justify-center py-8 md:py-14">
        <div className="flex w-full max-w-[920px] flex-col overflow-hidden rounded-md border border-line bg-white md:flex-row">
          <div className="hidden flex-col justify-between gap-10 bg-navy p-10 text-white md:flex md:w-[42%]">
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{BRAND.wordmark}</p>
              <h2 className="font-serif text-[32px] font-semibold leading-tight">Make Every Morning Sacred</h2>
              <p className="text-[15px] leading-relaxed text-slate-light">{BRAND.tagline}.</p>
            </div>
            <ul className="flex flex-col gap-3 border-t border-navy-line pt-6 text-sm text-slate-light">
              <li>Track your orders from your account</li>
              <li>Save delivery addresses for faster checkout</li>
              <li>Review the products you have received</li>
            </ul>
          </div>

          <div className="flex flex-1 flex-col gap-5 p-5 md:p-10">
            <div role="group" aria-label="Log in or sign up" className="flex gap-1 rounded border border-line p-1">
              <SegmentButton active={mode === "login"} onClick={() => switchMode("login")}>
                Log in
              </SegmentButton>
              <SegmentButton active={mode === "signup"} onClick={() => switchMode("signup")}>
                Sign up
              </SegmentButton>
            </div>

            <h1 className="heading-display text-[26px] md:text-[30px]">
              {mode === "login" ? "Log in to your account" : "Create your account"}
            </h1>

            {mode === "login" && (
              <div role="group" aria-label="How to log in" className="flex gap-2">
                {(["password", "otp"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={method === m}
                    onClick={() => switchMethod(m)}
                    className={`inline-flex min-h-[40px] items-center rounded-full border px-4 text-[13px] font-medium ${
                      method === m ? "border-navy bg-navy text-white" : "border-field bg-white text-navy hover:border-navy"
                    }`}
                  >
                    {m === "password" ? "With password" : "With mobile OTP"}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
              {mode === "signup" && (
                <Field id="login-name" label="Full name">
                  <input
                    id="login-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="input"
                  />
                </Field>
              )}

              <Field id="login-phone" label="Mobile number">
                <div className="flex gap-2">
                  <span className="input flex w-14 shrink-0 items-center justify-center px-0 text-slate" aria-hidden="true">
                    +91
                  </span>
                  <input
                    id="login-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      if (otpSent) resetOtp();
                    }}
                    placeholder="10-digit number"
                    className="input min-w-0"
                  />
                </div>
              </Field>

              {mode === "signup" && (
                <Field id="login-email" label="Email (optional)">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="input"
                  />
                </Field>
              )}

              {!usingOtp && (
                <Field
                  id="login-password"
                  label="Password"
                  hint={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                >
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="input"
                  />
                </Field>
              )}

              {mode === "signup" && (
                <Field id="login-confirm" label="Confirm password">
                  <input
                    id="login-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="input"
                  />
                </Field>
              )}

              {mode === "login" && method === "password" && (
                <p className="text-[13px] text-slate">
                  Forgot your password?{" "}
                  <button type="button" onClick={() => switchMethod("otp")} className="font-semibold text-navy underline">
                    Log in with a mobile OTP instead
                  </button>
                </p>
              )}

              {usingOtp &&
                (otpSent ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[13px] font-semibold">Enter the OTP sent to +91 {phone}</p>
                    <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                    <p className="text-[13px] text-slate" aria-live="polite">
                      {resendIn > 0 ? (
                        `You can ask for a new OTP in ${resendIn}s.`
                      ) : (
                        <button type="button" onClick={sendOtp} disabled={loading} className="font-semibold text-navy underline">
                          Send a new OTP
                        </button>
                      )}
                    </p>
                  </div>
                ) : (
                  <button type="button" onClick={sendOtp} disabled={loading} className="btn btn-outline">
                    {loading ? "Sending…" : "Send OTP"}
                  </button>
                ))}

              {notice && (
                <p role="status" className="text-sm font-semibold text-success">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded border border-danger p-3 text-sm font-semibold text-danger">
                  {error}
                </p>
              )}

              {(!usingOtp || otpSent) && (
                <button type="submit" disabled={loading} className="btn btn-gold min-h-[52px]">
                  {submitLabel}
                </button>
              )}
            </form>

            <p className="text-center text-sm text-slate">
              {mode === "login" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                className="font-semibold text-navy underline"
              >
                {mode === "login" ? "Create an account" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the page can still be
  // statically generated at build time.
  return (
    <Suspense fallback={<div className="site-container py-16 text-center text-sm text-slate">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}