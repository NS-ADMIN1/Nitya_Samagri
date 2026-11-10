// apps/web/next.config.ts
// Customer storefront — nityasamagri

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // ── Output: standalone for Docker ─────────────────────────────────────────
  output: "standalone",

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nityasamagri-media.s3.ap-south-1.amazonaws.com" },
      { protocol: "https", hostname: "nityasamagri-media.s3.amazonaws.com" },
      { protocol: "https", hostname: "d1234abcd.cloudfront.net" },   // replace with your CF domain
      { protocol: "https", hostname: "nityasamagri.in" },
      { protocol: "https", hostname: "via.placeholder.com" },         // dev only
    ],
    formats:           ["image/webp", "image/avif"],
    minimumCacheTTL:   60 * 60 * 24 * 30,  // 30 days
    deviceSizes:       [640, 750, 828, 1080, 1200, 1920],
    imageSizes:        [16, 32, 64, 128, 256],
  },

  // ── Env vars exposed to browser ───────────────────────────────────────────
  env: {
    NEXT_PUBLIC_APP_NAME:        "nityasamagri",
    NEXT_PUBLIC_APP_URL:         process.env.NEXT_PUBLIC_APP_URL         || "https://nityasamagri.in",
    NEXT_PUBLIC_API_URL:         process.env.NEXT_PUBLIC_API_URL         || "http://localhost:4000/api/v1",
    NEXT_PUBLIC_WS_URL:          process.env.NEXT_PUBLIC_WS_URL          || "ws://localhost:4000/ws",
    NEXT_PUBLIC_RAZORPAY_KEY:    process.env.NEXT_PUBLIC_RAZORPAY_KEY    || "",
    // Firebase client config — phone OTP login (apps/web/lib/firebase.ts).
    // These are the public web-app config values from the Firebase console
    // (Project settings → General → Your apps), NOT the Admin SDK service
    // account the backend uses (FIREBASE_PRIVATE_KEY etc. in backend/.env).
    NEXT_PUBLIC_FIREBASE_API_KEY:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY             || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    NEXT_PUBLIC_FIREBASE_APP_ID:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID              || "",
    NEXT_PUBLIC_GA_ID:           process.env.NEXT_PUBLIC_GA_ID           || "",
    NEXT_PUBLIC_META_PIXEL_ID:   process.env.NEXT_PUBLIC_META_PIXEL_ID   || "",
    NEXT_PUBLIC_GTM_ID:          process.env.NEXT_PUBLIC_GTM_ID          || "",
  },

  // ── Security headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key:   "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.adminns.in wss://api.adminns.in https://lumberjack.razorpay.com",
              "frame-src https://api.razorpay.com",
            ].join("; "),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/images/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },

  // ── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Legacy URL support
      // "/shop" is a real page (app/shop/page.jsx) — it must not redirect.
      { source: "/products",     destination: "/shop",      permanent: false },
      { source: "/my-account",   destination: "/account",   permanent: true  },
      { source: "/signin",       destination: "/login",     permanent: true  },
      { source: "/signup",       destination: "/login",     permanent: true  },
    ];
  },

  // ── Rewrites (API proxy for dev) ──────────────────────────────────────────
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:4000";
    return [
      {
        source:      "/api/proxy/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },

  // ── Compiler options ──────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // ── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // ── TypeScript ────────────────────────────────────────────────────────────
  typescript:    { ignoreBuildErrors: false },
  poweredByHeader: false,

  // ── Turbopack customization (replaces old webpack() config) ────────────────
  // SVG as React component via @svgr/webpack, migrated for Turbopack (Next 16 default bundler)
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;