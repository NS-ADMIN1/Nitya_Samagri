# 🪔 Nitya Samagri — Spiritual Commerce Platform
 
> **Bringing Divinity to Your Doorstep**
> India's most complete platform for pure puja samagri, verified pandits, and complete puja packages.
 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green.svg)](https://mongodb.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)
 
---
 
## 📋 Table of Contents
 
- [Overview](#overview)
- [Live URLs](#live-urls)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Modules Built](#modules-built)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Integrations](#integrations)
- [Contributing](#contributing)
---
 
## 🌟 Overview
 
nityasamagri is a **production-grade, full-stack spiritual e-commerce platform** built for the Indian market. It serves two core user groups:
 
| User | Panel | URL |
|------|-------|-----|
| 👤 Customer | Storefront | `nityasamagri.in` |
| 🛠️ Admin | Admin Dashboard | `adminns.in` |
| 🔌 Developers | REST API | `api.adminns.in` |
 
### Core Features
- 🛒 **E-commerce** — 1,250+ puja products with variants, bundles, and festival kits
- 🙏 **Pandit Booking** — Book verified pandits for 20+ ceremony types
- 📦 **Puja Packages** — One checkout: Pandit + Samagri delivered together
- 💳 **Payments** — Razorpay, UPI, COD, Cards, Wallets + webhook verification
- 🚚 **Delivery** — Eshopbox, Own Courier with slot scheduling
- 📡 **Real-time** — WebSocket order updates to customers and admins
- 🪔 **Festival Campaigns** — Navratri, Diwali, Janmashtami, Shivratri and more
- 📊 **Analytics** — Revenue, GST, inventory, customer LTV, festival performance
- 🔒 **Auth** — OTP login, JWT + refresh tokens, Google OAuth, RBAC
---
 
## 🌐 Live URLs
 
```
Customer Storefront  →  https://nityasamagri.in
Admin Panel          →  https://adminns.in
REST API             →  https://api.adminns.in
API Health           →  https://api.adminns.in/health
WebSocket            →  wss://api.adminns.in/ws
```
 
---
 
## 🛠 Tech Stack
 
### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript + React |
| Styling | Tailwind CSS + inline styles |
| State | React useState / Context |
| Fonts | Google Fonts (Playfair Display + Inter) |
 
### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express.js |
| Language | TypeScript |
| ODM | Mongoose 8 |
| Validation | Zod |
| Auth | JWT + bcrypt |
| Real-time | WebSocket (ws) |
| Logging | Winston |
 
### Infrastructure
| Layer | Technology |
|-------|-----------|
| Database | MongoDB 7 |
| Cache | Redis 7 |
| Media | AWS S3 + CloudFront |
| Proxy | Nginx |
| Containers | Docker |
| CI/CD | GitHub Actions |
| Hosting | AWS EC2 (see Terraform in `devops/terraform/`) |
| SSL | Let's Encrypt (Certbot) |
 
### Integrations
| Service | Purpose |
|---------|---------|
| Razorpay | Payments, refunds, webhooks |
| Eshopbox | Shipping, AWB, tracking (replaces Shiprocket) |
| Firebase Auth | Phone OTP login (client sends the SMS, backend verifies the ID token) |
| Gmail SMTP (Nodemailer) | Transactional emails (replaces SendGrid) |
| WhatsApp Business API | Order notifications |
| Google Analytics 4 | Web analytics |
| Meta Pixel | Ad tracking |
 
---
 
## 📁 Project Structure
 
```
nityasamagri/                          # Monorepo root (Turborepo)
│
├── apps/
│   ├── web/                        # Customer storefront (Next.js)
│   │   └── app/
│   │       ├── (home)/page.tsx     # Homepage
│   │       ├── product/[slug]/     # Product detail
│   │       ├── book-pandit/        # Pandit booking flow
│   │       ├── cart/               # Cart & checkout
│   │       ├── account/            # Customer dashboard
│   │       ├── delivery/           # Delivery scheduling
│   │       └── login/              # Auth pages
│   │
│   ├── admin/                      # Admin panel (Next.js)
│       └── app/
│           ├── dashboard/          # Admin dashboard
│           └── store/              # Store CMS
│   
│ 
├── backend/                        # Node.js REST + WebSocket API
│   ├── src/
│   │   ├── app.ts                  # Express entry point
│   │   ├── shared.ts               # Middlewares + utils
│   │   ├── websocket/
│   │   │   └── ws.server.ts        # Real-time server
│   │   └── modules/
│   │       ├── auth/               # Auth routes
│   │       ├── orders/             # Order management
│   │       ├── products/           # Product catalog
│   │       └── payments/           # Razorpay integration
│   └── database/
│       └── models/                 # Mongoose schemas (22 models)
│
├── devops/
│   ├── docker/
│   │   ├── docker-compose.dev.yml  # Local development
│   │   └── docker-compose.prod.yml # Production overrides
│   └── nginx/
│       └── nginx.conf              # Nginx config (blue/green via nginx/active/)
│
├── turbo.json                      # Monorepo build pipeline
└── README.md
```
 
---
 
## 🧩 Modules Built
 
### Customer Storefront (10 pages)
| Page | File | Description |
|------|------|-------------|
| Homepage | `StoreFront.jsx` | Hero, categories, products, pandits, festival campaigns |
| Product Detail | `ProductDetail.jsx` | Variants, tabs, reviews, cross-sells, delivery checker |
| Pandit Booking | `PanditBooking.jsx` | 5-step booking: Pandit → Service → Date → Details → Confirm |
| Cart & Checkout | `CartCheckout.jsx` | Products + services cart, Razorpay payment, COD, UPI |
| Customer Account | `CustomerAccount.jsx` | Orders, bookings, wishlist, rewards, addresses, profile |
| Delivery Scheduling | `DeliveryScheduling.jsx` | Slot picker, courier selection, live tracking |
| Auth Pages | `AuthPages.jsx` | Login (OTP/Password), Register (2-step), OTP verify, Forgot password |
 
### Admin Panel (2 pages)
| Page | File | Description |
|------|------|-------------|
| Admin Dashboard | `AdminDashboard.jsx` | Overview, Orders, Users, Reports with dark professional theme |
| Store Management | `StoreManagement.jsx` | Homepage CMS, Banners, Festival Campaigns, Blog, SEO, Announcements |
 
 
### Backend API (7 modules)
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | 7 routes | Register, Login, OTP, Refresh, Logout, Profile |
| Products | 6 routes | CRUD, search, pagination, stock management |
| Orders | 8 routes | Create, list, status updates, admin stats, cancel |
| Payments | 5 routes | Razorpay order, verify, webhook, refund, history |
| WebSocket | — | Real-time order updates, payment events, admin alerts |
 
---
 
## ⚡ Quick Start
 
### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Git
### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/nityasamagri.git
cd nityasamagri
```
 
### 2. Set up environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```
 
### 3. Start with Docker (recommended)
```bash
# Start all services
docker compose -f devops/docker/docker-compose.dev.yml up -d
 
# Seed sample data (no separate migration step needed — Mongoose
# builds/validates collections against the schemas on connect)
docker compose -f devops/docker/docker-compose.dev.yml exec api npm run seed
```
 
### 4. Access the apps
| App | URL |
|-----|-----|
| Customer Storefront | http://localhost:3000 |
| Admin Panel | http://localhost:3001 |
| REST API | http://localhost:4000 |
| API Docs | http://localhost:4000/health |
| pgAdmin | http://localhost:5050 |
| MinIO Console | http://localhost:9001 |
 
### 5. Without Docker (manual setup)
```bash
# Install dependencies
cd backend && npm install
cd ../apps/web && npm install
cd ../admin && npm install
 
# Start MongoDB and Redis locally
# then:
 
# Terminal 1 — API
cd backend
npm run dev
 
# Terminal 2 — Customer web
cd apps/web
npm run dev
 
# Terminal 3 — Admin
cd apps/admin
npm run dev -- -p 3001
```
 
---
 
## 🔐 Environment Variables
 
Copy `backend/.env.example` to `backend/.env` and fill in all values:
 
```env
# App
NODE_ENV=development
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
 
# Database
MONGO_URI=mongodb://nityasamagri:password@localhost:27017/nityasamagri?authSource=admin
 
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
 
# JWT (use strong random strings — min 32 chars)
JWT_SECRET=your_jwt_secret_min_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_min_32_characters
JWT_REFRESH_EXPIRES_IN=30d
 
# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
 
# Firebase (phone OTP auth — client sends the SMS, backend verifies the
# ID token via Firebase Admin SDK)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
 
 
# Gmail SMTP (Email, via Nodemailer — use a Google Workspace address or a
# Gmail account with an App Password: https://myaccount.google.com/apppasswords)
GMAIL_USER=noreply@nityasamagri.in
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
 
# Eshopbox (Shipping — replaces Shiprocket)
ESHOPBOX_API_TOKEN=your_eshopbox_bearer_token
ESHOPBOX_EXTERNAL_CHANNEL_ID=your_channel_id
ESHOPBOX_WEBHOOK_SECRET=
 
# AWS S3 (Media)
AWS_ACCESS_KEY_ID=XXXXXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_REGION=ap-south-1
AWS_S3_BUCKET=nityasamagri-media
```
 
---
 
## 📡 API Reference
 
### Base URL
```
Development:  http://localhost:4000/api/v1
Production:   https://api.adminns.in/api/v1
```
 
### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
```
 
### Auth Endpoints
```
POST   /auth/email-otp/send    Email a 6-digit sign-up code
POST   /auth/email-otp/verify  Check the code, get an emailToken
POST   /auth/register          Register new user (needs a verified mobile idToken OR an emailToken)
POST   /auth/login             Login with phone + password
POST   /auth/otp/request       Request OTP (rate limited: 3/10min)
POST   /auth/otp/verify        Verify OTP and get tokens
POST   /auth/refresh           Refresh access token
POST   /auth/logout            Logout (revoke token)
GET    /auth/me                Get current user profile
```
 
### Product Endpoints
```
GET    /products               List products (search, filter, paginate)
GET    /products/:slug         Get single product
POST   /products               Create product (admin)
PATCH  /products/:id           Update product (admin)
DELETE /products/:id           Archive product (super_admin)
PATCH  /products/:id/stock     Update stock (warehouse)
```
 
### Order Endpoints
```
POST   /orders                 Create order
GET    /orders                 Get my orders
GET    /orders/:orderId        Get single order
POST   /orders/:orderId/cancel Cancel order
GET    /orders/admin/all       Admin: all orders with filters
PATCH  /orders/:orderId/status Admin: update status + WS broadcast
GET    /orders/admin/stats     Admin: dashboard statistics
```
 
### Payment Endpoints
```
POST   /payments/create-order  Create Razorpay order
POST   /payments/verify        Verify payment signature
POST   /payments/webhook       Razorpay webhook handler
POST   /payments/refund        Admin: initiate refund
GET    /payments/history       My payment history
```
 
### Query Parameters (Products)
```
?q=cow ghee          Full-text search
?categoryId=uuid     Filter by category
?minPrice=100        Min price filter
?maxPrice=500        Max price filter
?inStock=true        Only in-stock products
?isFeatured=true     Featured products only
?sortBy=price        Sort field (price|createdAt|name|stock|sold)
?sortOrder=asc       Sort direction (asc|desc)
?page=1              Page number
?limit=20            Items per page (max 100)
```
 
### Response Format
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "pages": 63
  }
}
```
 
### Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "phone", "message": "Invalid Indian mobile number" }
  ]
}
```
 
---
 
## 📡 WebSocket Events
 
### Connect
```js
const ws = new WebSocket(`wss://api.adminns.in/ws?token=${accessToken}`);
```
 
### Events received by customer
```js
ws.onmessage = (e) => {
  const { event, payload } = JSON.parse(e.data);
  switch(event) {
    case "ORDER_STATUS_UPDATE":  // order status changed
    case "PAYMENT_SUCCESS":      // payment confirmed
    case "PAYMENT_FAILED":       // payment failed
    case "BOOKING_CONFIRMED":    // pandit accepted booking
  }
};
```
 
### Events received by admin
```js
case "NEW_ORDER_ALERT":      // new order placed
case "LOW_STOCK_ALERT":      // product stock low
case "PAYMENT_FAILED":       // payment gateway issue
```
 
### Event payload structure
```json
{
  "event": "ORDER_STATUS_UPDATE",
  "payload": {
    "orderId":   "ORD-2026-1999",
    "status":    "shipped",
    "trackingNo": "ESB20261999001",
    "courierName": "Eshopbox",
    "timestamp": 1748649600000
  }
}
```
 
---
 
## 🗄 Database Schema
 
**22 models** across 6 domains:
 
```
Users & Auth      → User, Address
Catalog           → Category, Product, ProductVariant, ProductImage
Orders            → Order, OrderItem, OrderTimeline, PaymentLog
Promotions        → Coupon, LoyaltyLog, WishlistItem
Pandits           → PanditProfile, PanditService, PanditBooking,
                    PanditAvailability, PanditBlockedDate
Support           → InventoryLog, Review, ReturnRequest, SupportTicket
```
 
### Key relationships
```
User       → has many Orders, Addresses, Reviews, WishlistItems
Order      → has many OrderItems, OrderTimeline, PaymentLogs
Product    → has many Variants, Images, Reviews, OrderItems
PanditProfile → has many Services, Bookings, BlockedDates
```
 
### Schema changes
Mongoose has no separate migration step — schemas in `backend/src/database/models/`
are applied as soon as the app connects, so a schema change just needs a
restart. For data backfills/transforms, write a one-off script under
`backend/scripts/` and run it with `ts-node`.
```bash
# Browse the database directly
mongosh "$MONGO_URI"
# or connect with MongoDB Compass using the same connection string
```
 
---
 
## 🚀 Deployment
 
### Docker on AWS EC2 (recommended)
 
```bash
# 1. Launch EC2 instance (t3.medium or larger)
#    AMI: Ubuntu 22.04 LTS
#    Ports open: 22, 80, 443
 
# 2. SSH into server
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP
 
# 3. Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
 
# 4. Install Certbot for SSL
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d nityasamagri.in \
  -d www.nityasamagri.in \
  -d adminns.in \
  -d api.adminns.in
 
# 5. Clone and configure
git clone https://github.com/YOUR_USERNAME/nityasamagri.git
cd nityasamagri
cp backend/.env.example backend/.env
nano backend/.env   # fill production values
 
# 6. Deploy — migrations run automatically inside the api container's
#    own entrypoint before the server starts, so no separate step is needed
docker compose -f devops/docker/docker-compose.dev.yml \
               -f devops/docker/docker-compose.prod.yml \
               up -d --build
 
# 7. Check status
docker compose ps
docker compose logs api --tail=50
```

## 🔄 CI/CD
 
### GitHub Actions workflows (add to `.github/workflows/`)
 
**backend.yml** — Triggers on push to `main`, builds Docker image, pushes to Docker Hub, deploys to EC2:
 
```yaml
name: Deploy API
on:
  push:
    branches: [main]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push Docker image
        run: |
          docker build -t nityasamagri/api:latest ./backend
          docker push nityasamagri/api:latest
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd Nitya_Samagri
            git pull origin main
            docker compose -f devops/docker/docker-compose.dev.yml \
                           -f devops/docker/docker-compose.prod.yml \
                           up -d --build api
            # No separate migrate step — the api container's entrypoint
            # (devops/docker/entrypoints/api-entrypoint.sh) runs migrations
            # automatically before the server starts.
```
 
**frontend.yml** / **admin.yml** — Same pattern for the customer web app and admin panel, each on push to `main` when their own `apps/*` path changes (see the actual workflow files in `.github/workflows/` for the real, blue/green-aware version of this — the snippet above is simplified for illustration).
 
---
 
## 🔗 Integrations
 
### Razorpay Setup
```bash
# 1. Create account at razorpay.com
# 2. Dashboard → Settings → API Keys → Generate Key
# 3. Add to .env:
RAZORPAY_KEY_ID=rzp_live_XXXXX
RAZORPAY_KEY_SECRET=XXXXX
# 4. Dashboard → Webhooks → Add webhook URL:
#    https://api.adminns.in/api/v1/payments/webhook
# 5. Select events: payment.captured, payment.failed, refund.processed
```
 
### Eshopbox Setup
```bash
# 1. Create a workspace at eshopbox.com
# 2. Settings → API → generate a Bearer API token
# 3. Note the "sales channel" ID Eshopbox assigns your integration
#    (sent as externalChannelID on every order create call)
# 4. Add to .env:
ESHOPBOX_API_TOKEN=your_eshopbox_bearer_token
ESHOPBOX_EXTERNAL_CHANNEL_ID=your_channel_id
ESHOPBOX_WEBHOOK_SECRET=  # generate a long random value; configure the
                          # same value in your Eshopbox workspace's webhook
                          # settings so POST /integrations/shipping/webhook
                          # can verify incoming calls
```
 
### Firebase Phone OTP Setup
```bash
# 1. Create a project at console.firebase.google.com
# 2. Enable Phone sign-in under Authentication → Sign-in method
# 3. Project settings → Service accounts → Generate new private key
# 4. Add to .env:
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
```
Firebase handles sending the OTP SMS client-side; the backend only verifies
the ID token it gets back via the Firebase Admin SDK's `verifyIdToken()`.

---
 
## 🤝 Contributing
 
1. Fork the repository
2. Create feature branch: `git checkout -b feature/festival-analytics`
3. Commit changes: `git commit -m "feat: add festival analytics dashboard"`
4. Push branch: `git push origin feature/festival-analytics`
5. Open Pull Request
### Commit Convention
```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting
refactor: Code restructure
test:     Tests
chore:    Build/config changes
```
 
---
 
## 📊 Project Stats
 
| Metric | Value |
|--------|-------|
| Total Files Built | 27 |
| Frontend Pages | 10 |
| API Endpoints | 26+ |
| Database Models | 22 |
| WebSocket Events | 8 |
| Docker Services | 8 |
| Lines of Code | ~12,000+ |
 
---
 
## 📄 License
 
MIT License — see [LICENSE](LICENSE) for details.
 
---
 
## 🙏 Support
 
- **Email:** support@nityasamagri.in
- **Phone:** +91 8595427053
- **WhatsApp:** +91 8595427053
- **Location:** Noida, Uttar Pradesh, India
---
 
<div align="center">
  <strong>🪔 nityasamagri — Simplifying Your Spiritual Journey 🪔</strong><br/>
  Built with ❤️ in India
</div>