// src/modules/auth/auth.routes.ts
//
// Sign-up, login, sessions and the signed-in person's own profile.
// (The admin customer list at /auth/admin/users is the customers module.)
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  EmailOtpSendSchema,
  EmailOtpVerifySchema,
  LoginSchema,
  OtpVerifySchema,
  RefreshSchema,
  RegisterSchema,
  UpdateProfileSchema,
} from "./auth.schema";
import * as authController from "./auth.controller";

const router = Router();

// Sign-up needs a verified mobile (Firebase OTP) or a verified email (code below).
router.post("/email-otp/send",   validate(EmailOtpSendSchema), authController.sendEmailOtp);
router.post("/email-otp/verify", validate(EmailOtpVerifySchema), authController.verifyEmailOtp);
router.post("/register",   validate(RegisterSchema), authController.register);
router.post("/login",      validate(LoginSchema), authController.login);
router.post("/otp/verify", validate(OtpVerifySchema), authController.verifyOtp);
router.post("/refresh",    validate(RefreshSchema), authController.refresh);
router.post("/logout",     authenticate, authController.logout);

router.get("/me",   authenticate, authController.me);
router.patch("/me", authenticate, validate(UpdateProfileSchema), authController.updateMe);

export default router;