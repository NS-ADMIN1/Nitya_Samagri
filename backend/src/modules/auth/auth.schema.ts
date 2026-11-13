// src/modules/auth/auth.schema.ts
import { z } from "zod";
import { indianPhone } from "../../utils/validators";

// A new account must prove the mobile number OR the email first:
//   • idToken    — Firebase ID token from a phone-OTP check
//   • emailToken — from POST /auth/email-otp/verify (needs `email` too)
export const RegisterSchema = z
  .object({
    name:       z.string().min(2).max(60),
    phone:      indianPhone(),
    email:      z.string().trim().toLowerCase().email().optional(),
    password:   z.string().min(8).max(72),
    idToken:    z.string().min(1).optional(),
    emailToken: z.string().min(1).optional(),
  })
  .refine((d) => !!d.idToken || !!d.emailToken, {
    message: "Verify your mobile number or email before creating an account",
    path: ["verification"],
  })
  .refine((d) => !d.emailToken || !!d.email, {
    message: "Enter the email address you verified",
    path: ["email"],
  });

export const EmailOtpSendSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const EmailOtpVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code:  z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const LoginSchema = z
  .object({
    phone:    indianPhone().optional(),
    email:    z.string().email().optional(),
    password: z.string().min(1),
  })
  .refine((d) => !!d.phone !== !!d.email, {
    message: "Provide either phone or email, not both",
  })
  .refine((d) => !d.email || d.email.toLowerCase().endsWith("@adminns.in"), {
    message: "Email login is only available for @adminns.in staff accounts. Customers should log in with phone.",
    path: ["email"],
  });

// The customer finishes OTP entry in the Firebase client SDK and sends us
// the ID token it returns.
export const OtpVerifySchema = z.object({
  idToken: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const UpdateProfileSchema = z
  .object({
    name:  z.string().trim().min(2).max(60).optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.name !== undefined || d.email !== undefined, { message: "Nothing to update" });

export type RegisterInput      = z.infer<typeof RegisterSchema>;
export type LoginInput         = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type EmailOtpVerifyInput = z.infer<typeof EmailOtpVerifySchema>;