// src/modules/auth/auth.routes.ts
//
// Sign-up, login, sessions and the signed-in person's own profile.
// (The admin customer list at /auth/admin/users is the customers module.)
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { LoginSchema, OtpVerifySchema, RefreshSchema, RegisterSchema, UpdateProfileSchema } from "./auth.schema";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register",   validate(RegisterSchema), authController.register);
router.post("/login",      validate(LoginSchema), authController.login);
router.post("/otp/verify", validate(OtpVerifySchema), authController.verifyOtp);
router.post("/refresh",    validate(RefreshSchema), authController.refresh);
router.post("/logout",     authenticate, authController.logout);

router.get("/me",   authenticate, authController.me);
router.patch("/me", authenticate, validate(UpdateProfileSchema), authController.updateMe);

export default router;