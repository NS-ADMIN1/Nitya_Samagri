// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async.middleware";
import * as authService from "./auth.service";

// POST /api/v1/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: data.accessToken ? "Registration successful." : "Registration successful. Please verify your phone number.",
    data,
  });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

// POST /api/v1/auth/otp/verify
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.loginWithOtp(req.body.idToken);
  res.json({ success: true, data });
});

// POST /api/v1/auth/refresh
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refresh(req.body.refreshToken);
  res.json({ success: true, data });
});

// POST /api/v1/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.user!.userId);
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/v1/auth/me
export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.userId);
  res.json({ success: true, data: { user } });
});

// PATCH /api/v1/auth/me
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.userId, req.body);
  res.json({ success: true, data: { user } });
});
