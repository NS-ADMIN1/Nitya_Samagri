# ─────────────────────────────────────────────────────────────────────────────
# apps/*/Dockerfile — Multi-stage Next.js 14 production build
# Works for: apps/web, apps/admin
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Base ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ── Stage 2: Install dependencies ────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/admin/package.json ./apps/admin/package.json
RUN npm ci --workspace=apps/admin --include-workspace-root --frozen-lockfile

# ── Stage 3: Development ──────────────────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Stage 4: Build for production ────────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build args for public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY=$NEXT_PUBLIC_RAZORPAY_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx turbo run build --filter=./apps/admin

# ── Stage 5: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Copy Next.js standalone output
# Requires: output: "standalone" in next.config.ts
# In a Turborepo workspace, the build runs from the repo root, so Next
# writes its output under apps/admin/.next (not /app/.next), and the
# standalone bundle itself nests the app one level deeper under
# .next/standalone/apps/admin — flatten it back to /app.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static    ./apps/admin/.next/static

# Static assets (brand logos, favicons). Standalone output does not include
# public/, so it is copied in explicitly — same as apps/web.
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public          ./apps/admin/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/admin/server.js"]