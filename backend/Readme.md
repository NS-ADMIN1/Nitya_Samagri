# Nitya Samagri backend

REST + WebSocket API for the Nitya Samagri store. Express + TypeScript,
MongoDB (Mongoose), Redis.

## Stack

- Express 4 + TypeScript
- MongoDB via Mongoose 8 — models in `src/database/models/`
- Redis (ioredis) — product cache, login lockout, refresh tokens, WebSocket fan-out
- JWT access + refresh tokens; customer phone OTP through Firebase Auth
- Razorpay (payments), Eshopbox (shipping), Gmail SMTP via Nodemailer (email)
- WebSocket server for live order updates (`src/websocket/`)
- Jest + Supertest for tests

## Getting started

```bash
cp .env.example .env    # MONGO_URI, JWT secrets, FIREBASE_*, RAZORPAY_* …
npm install             # from the repo root (npm workspaces)
npm run dev             # http://localhost:4000
```

Needs MongoDB and Redis running. From the repo root:

```bash
docker compose -f devops/docker/docker-compose.dev.yml up -d mongodb redis
```

Orders, cancellations, stock updates and payment confirmation use MongoDB
transactions, which only work on a replica set (MongoDB Atlas, or a local
`mongod --replSet`), not on a plain standalone server.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run seed` | Seed a demo admin user, category and product |
| `npm test` | Run the Jest suite |
| `npm run lint` | ESLint (no config file in this folder yet) |

Server scripts (deploy, rollback, backup, smoke test) live in `devops/scripts/`.

## Structure

```
src/
├── server.ts          starts the server (DB connection, HTTP, WebSocket)
├── app.ts             builds the Express app (security, body parsing, rate limit)
├── routes.ts          mounts every module under /api/v1
├── config/            env (validated at boot), database, redis, firebase, permissions
├── modules/           one folder per feature
│   └── <feature>/
│       ├── <feature>.routes.ts       URLs + who may call them + validation
│       ├── <feature>.controller.ts   request in, response out
│       ├── <feature>.service.ts      business logic and database access
│       └── <feature>.schema.ts       Zod input validation
├── integrations/      Razorpay, Eshopbox, mail (Gmail SMTP)
├── notifications/     what customers and the team are told (email, live alerts)
├── jobs/              background tasks (cancel unpaid orders)
├── database/          models + seed
├── middlewares/       auth, roles, validation, errors, rate limit
├── cache/             Redis cache helpers
├── websocket/         live updates
└── utils/             AppError, logger, paginate, slugify, validators
tests/                 unit + integration
```

### How a request flows

```
Request → Route → Controller → Service → Model (MongoDB)
                                  ├──→ Integrations (Razorpay, Eshopbox, mail)
                                  └──→ Notifications (email, live alerts)
```

- **Routes** only say the URL, who may call it and which schema validates it.
- **Controllers** are thin: read the request, call one service, send the response.
- **Services** hold the business logic and are the only layer that touches
  models and integrations.
- **Config** is read through `config/env.ts`, not `process.env`.
- **Errors**: throw `AppError(message, status)`; `middlewares/error.middleware.ts`
  turns every error into `{ success: false, message, errors? }`.

Every module follows this layout except `health` (one small file). Two
modules share an address with another: `inventory` is served under
`/products`, and `customers` under `/auth/admin/users`.

### Endpoints added in the backend rework

| Endpoint | For |
|---|---|
| `PATCH /auth/me` | A person edits their own name / email |
| `PATCH /auth/admin/users/:id/status` | Block or unblock a customer |
| `POST /team/members/:id/reset-password` | New temporary password for a staff member |
| `POST /coupons/validate` | Check a coupon against the cart before ordering |
| `GET /products/admin/stock-logs` | Stock history across all products |
| `POST /products/admin/receive` | Receive a supplier delivery (many products at once) |
| `GET /reviews/admin/all`, `PATCH`/`DELETE /reviews/admin/:id` | Hide, show or remove reviews |
| `GET /settings`, `PATCH /settings` | Store details: name, GSTIN, address, support contact, invoice prefix |
| `GET /settings/public` | Store name and support contact for the storefront |
| `GET /orders/:orderId/invoice` | The GST invoice as data; add `?format=html` for a printable page |
| `POST /media/upload-url` | A signed link for uploading one photo to S3 |

Changed: products now carry `images`, `imageUrl`, `rating` and
`reviewCount`; `POST`/`PATCH /products` accept `images` and (on edit)
`variants`; `PATCH /products/:id/stock` accepts `variantId`;
`GET /integrations/shipping/track/:orderId` needs a login.

### Who may do what

- **Customers** sign in with phone + password or phone OTP (Firebase).
  **Staff** sign in with an `@adminns.in` email and password.
- **Sessions**: a 15-minute access token plus a refresh token kept in Redis.
  Each refresh re-reads the account, so a blocked account cannot renew and a
  changed role is picked up. Blocking someone deletes their refresh token.
- **Admin routes check permissions** (`requirePermission` in
  `middlewares/rbac.middleware.ts`, list in `config/permissions.ts`) against
  the database on every request, so a change by the super admin applies at
  once. A member with no saved permissions gets their role's defaults.
- **Team & Roles** stays super-admin only.
- **Public content** (`GET /cms/:resource`) returns only live items to
  visitors and everything to signed-in staff.

### How orders and money work

- **Totals and status rules** are plain functions in `modules/orders/order.rules.ts`.
- **Stock and coupon holds**: taken when an order is placed, given back once
  when it is cancelled, returned, or fully refunded before shipping
  (`modules/orders/order.stock.ts`).
- **Unpaid online orders** are cancelled after `UNPAID_ORDER_MINUTES`
  (default 30) by `jobs/unpaidOrders.job.ts`, which frees their stock.
- **Payments** are recorded once, whether the browser (`/payments/verify`)
  or Razorpay's webhook reports them first.
- **Cancelling a paid order refunds it automatically** through Razorpay; if
  that fails, the order timeline says so and the team is alerted.
- **Cash on delivery** orders become paid when marked delivered.

### Photo uploads (AWS S3)

Photos go from the admin's browser straight to the bucket; the API only
signs a link (`integrations/s3.ts`, no AWS package needed):

1. `POST /media/upload-url` with `{ folder, contentType }` → `{ uploadUrl, headers, publicUrl }`
2. the browser sends the file with `PUT uploadUrl` and those `headers`
3. `publicUrl` is saved on the product (`images: [{ url }]`), category, banner …

JPG, PNG and WebP only; a link is valid for 5 minutes and for one file type.

The bucket needs two things set once in the AWS console:

- **CORS**, so the admin site may upload:
  `AllowedMethods: ["PUT"]`, `AllowedHeaders: ["*"]`,
  `AllowedOrigins: ["https://adminns.in"]` (add `http://localhost:3001` for local work).
- **Public read** for the photos — either a bucket policy allowing
  `s3:GetObject` to everyone, or a CloudFront distribution in front of the
  bucket with its address in `MEDIA_BASE_URL`.

The IAM user behind `AWS_ACCESS_KEY_ID` only needs `s3:PutObject` on this bucket.

### Invoices

- An invoice needs the store's GSTIN and address, set once in Settings.
- The invoice number (`NS/2026-27/000123`, one series per financial year) is
  given the first time an invoice is opened, and never changes.
- GST is split into CGST + SGST when the delivery state is the store's
  state, and shown as IGST otherwise (`modules/invoices/invoice.rules.ts`).
- There is no PDF library: `?format=html` returns a printable A4 page, and
  the browser's "Save as PDF" makes the PDF.

## Known gaps

1. Replaced or removed photos are not deleted from the S3 bucket; they stay
   there unused.
2. `eshopbox.service.ts` tracking and webhook field names are best-effort;
   verify against a real payload from the Eshopbox workspace.
3. Models with no API yet: pandit booking, wishlist, loyalty log, returns,
   support tickets.
4. Tests cover validation, health, 404, the product cache and the pure
   rules (totals, order status flow, permissions) — nothing yet that runs
   orders or payments against a database.
5. Customers get emails and live updates only; no SMS is sent (Twilio was
   removed). A customer without an email on file gets no order emails.