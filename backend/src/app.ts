import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { errorHandler } from "./middlewares/error.middleware";
import { notFound } from "./middlewares/notFound.middleware";
import { globalLimiter } from "./middlewares/rateLimit.middleware";
import apiRoutes from "./routes";

// This file builds and exports the Express app only — it never binds a port,
// creates an HTTP server, or opens the WebSocket server. That work belongs to
// server.ts, so this module can be imported safely by tests (supertest) and
// anything else that just needs the request-handling pipeline.
const app = express();

// The API runs behind Nginx. Trusting the proxy makes req.ip the visitor's
// real address (from X-Forwarded-For) instead of the proxy's own.
app.set("trust proxy", env.TRUST_PROXY);

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      env.ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(compression());
app.use(morgan("combined", { stream: { write: msg => logger.info(msg.trim()) } }));

// Raw body for Razorpay webhook signature verification
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
// Registered before the rate limiter so container/uptime probes never get a 429.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" });
});

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(globalLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/v1", apiRoutes);

// ── Error handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;