// src/middlewares/rateLimit.middleware.ts
import { Request } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

/**
 * API-wide limit per visitor IP (see TRUST_PROXY in config/env.ts — without
 * it every visitor shares the proxy's IP and one busy hour locks everyone
 * out). Webhooks are skipped: Razorpay and Eshopbox call from a handful of
 * server IPs, are authenticated by signature/secret, and must not be dropped.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req: Request) => req.path.endsWith("/webhook"),
  message: { success: false, message: "Too many requests, please try again later." },
});
