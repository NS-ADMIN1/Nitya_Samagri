// src/modules/auth/auth.schema.ts
import { z } from "zod";
import { indianPhone } from "../../utils/validators";

export const RegisterSchema = z.object({
  name:     z.string().min(2).max(60),
  phone:    indianPhone(),
  email:    z.string().email().optional(),
  password: z.string().min(8).max(72),
  // Optional Firebase ID token from a phone-OTP check done just before
  // signing up. With it the account starts verified and is signed in.
  idToken:  z.string().min(1).optional(),
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
