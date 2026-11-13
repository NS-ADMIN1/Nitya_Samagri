# Nitya Samagri admin panel

Staff-facing panel for the Nitya Samagri platform: orders, products, stock,
coupons, storefront content, customers, reports and the team. Next.js 16
(App Router), talks to the `backend` API over REST.

## Stack

- Next.js 16 + React 18, TypeScript
- Tailwind CSS — light theme in the brand palette (navy + gold on
  off-white), the same values as `apps/web`; see `tailwind.config.ts`
- SWR for data fetching/caching
- Zustand, Zod (installed; not used yet)
- No component library and no icon package — the shared pieces live in
  `components/ui/`

## Getting started

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL — see note below
npm install
npm run dev                  # http://localhost:3001
```

Needs the `backend` API running and reachable at `NEXT_PUBLIC_API_URL`
(defaults to `http://localhost:4000` if unset; the value may end in
`/api/v1` or not — `lib/apiBase.ts` handles both). From the repo root:

```bash
docker compose -f devops/docker/docker-compose.dev.yml up -d api mongodb redis
```

`.env.example` only lists `NEXT_PUBLIC_API_URL`, but `next.config.ts` also
reads `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_APP_URL` (both have working
defaults, so they're optional for local dev — set them explicitly for a
deployed environment).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start with hot-reload on port **3001** |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm start` | Run the production build, also on port 3001 |
| `npm run lint` | `next lint` |
| `npm run type-check` | `tsc --noEmit` |

Port 3001 is a local-dev convenience so `web` (3000) and `admin` can run
side by side. In Docker/production both listen on 3000 inside the
container — see `Dockerfile` / `devops/docker/docker-compose.*.yml`, where
Nginx (`devops/nginx/sites/admin.conf`) is what actually separates them by
domain.

## Structure

Same layout as `apps/web`: routes in `app/`, UI in `components/`, data and
helpers in `lib/`.

```
app/
├── layout.tsx               # Root layout — Inter font, noindex metadata
├── globals.css              # Tailwind + light-theme base styles
├── login/                   # Staff sign-in (@adminns.in email + password)
├── dashboard/               # "Needs your attention" cards, store numbers, latest orders
├── orders/                  # Orders by stage, next-step buttons, order detail panel
├── products/                # Catalogue list + edit form; new/ is the Add product page
├── inventory/               # Stock list, quick add/remove, per-product history
├── coupons/                 # Coupon list + create/edit form
├── store/                   # Storefront content (announcements, festivals, …)
├── customers/               # Customer list (read-only)
├── reports/                 # Sales, products and payments from real order data
└── team/                    # Staff accounts, roles and permissions (super admin)

components/
├── layout/                  # AdminShell (frame for every page), Sidebar, Topbar, RequireAuth
├── ui/                      # Button, Card, DataTable, Field, Icon, Notice, Pager, SearchInput,
│                            # StatusPill, Tabs, Toggle, Avatar
└── dashboard/ orders/ products/ inventory/ coupons/ store/ team/ reports/

lib/
├── api.ts                   # Fetch wrapper — attaches bearer token, auto-refreshes on 401
├── adminAuth.ts             # Session storage (localStorage) + login/logout
├── nav.ts                   # Sidebar menu and which roles see which items
├── theme.ts, format.ts      # Brand values; money, date and count formatting
├── orderStatus.ts           # Wording and colour for order and stock statuses
└── orders.ts, stats.ts, products.ts, inventory.ts, coupons.ts, cms.ts, team.ts

public/                      # brand/ logos and favicons (copied from apps/web)
```

A new page only needs to wrap its content in `AdminShell`:

```tsx
<AdminShell title="Products" subtitle="186 products" actions={<Button…/>}>
  …page content…
</AdminShell>
```

`AdminShell` adds the login check, the sidebar and the page title bar.

## Auth model

Staff log in with an `@adminns.in` email + password — **not** the phone-OTP
flow customers use on `apps/web`. `lib/adminAuth.ts` posts to
`POST /auth/login`; the backend itself rejects anyone without an
admin/staff role, so the frontend's `@adminns.in` check is a UX nicety, not
the real gate.

The session (access token, refresh token, user) lives in
`localStorage` under `nitya_admin_session` — there's no httpOnly cookie.
`RequireAuth` only checks that an access token is *present* client-side
before rendering a page; it doesn't verify it's still valid, so an expired
token briefly renders the page before the first API call 401s and
`lib/api.ts`'s auto-refresh logic either silently renews it or clears the
session.

## Roles and the menu

The login response carries the user's base role but not their individual
permission list, so the sidebar (`lib/nav.ts`) filters menu items with a
copy of the backend's role defaults (`backend/src/config/permissions.ts`,
`DEFAULT_PERMISSIONS_BY_ROLE`). This only decides what is *shown* — the API
enforces access on every call, and pages show a plain "no access" message
when it refuses. If the defaults change in the backend, change them in
`lib/nav.ts` too.

## Pages, and what they call

All paths are under `/api/v1`.

| Page | Backend endpoints it uses |
|---|---|
| `/login` | `POST /auth/login` |
| `/dashboard` | `GET /orders/admin/stats`, `GET /orders/admin/all`, `GET /products/admin/all` |
| `/orders` | `GET /orders/admin/all`, `GET /orders/:orderId`, `PATCH /orders/:orderId/status` |
| `/products`, `/products/new` | `GET /products/admin/all`, `POST /products`, `PATCH/DELETE /products/:id`, `GET/POST /categories`, `GET/POST /brands` |
| `/inventory` | `GET /products/admin/all`, `PATCH /products/:id/stock`, `GET /products/admin/:id/logs` |
| `/coupons` | `GET/POST /coupons`, `PATCH/DELETE /coupons/:id` |
| `/store` | `GET/POST/PATCH/DELETE /cms/{announcements,festivals,sections,banners,blogs,seo-pages}`, `GET /products` (festival product picker) |
| `/customers` | `GET /auth/admin/users` |
| `/reports` | `GET /orders/admin/stats` |
| `/team` | `GET /team/permissions`, `GET/POST /team/members`, `PATCH /team/members/:id`, `GET/POST /team/roles`, `PATCH/DELETE /team/roles/:id` |

## Known gaps

1. **Only announcements and festivals reach the customer site.** `apps/web`
   reads `/cms/announcements` and `/cms/festivals-public`; homepage
   sections, banners, blog posts and SEO pages are saved by the API but not
   read by the storefront yet. Those four Storefront tabs say so on screen.
2. **No product photos.** The Product model has no image field and there is
   no upload endpoint, so the product form has no photo section.
3. **No backend for some design items:** store-wide stock history, bulk
   "receive shipment", invoices, blocking a customer, staff password reset
   and a Settings page (shown as "Soon" in the menu).
4. **Optional fields cannot be emptied on edit** (e.g. removing a coupon's
   end date): the update endpoints ignore missing values and do not accept
   `null`.
5. ~~`lib/adminAuth.ts` and `lib/api.ts` build URLs differently.~~ Fixed:
   both now go through `lib/apiBase.ts`, which accepts `NEXT_PUBLIC_API_URL`
   with or without the `/api/v1` suffix and adds it exactly once.
6. **No shared package between `apps/web` and `apps/admin`.** The fetch
   wrapper, theme values and formatting helpers are duplicated between the
   two apps rather than pulled from a shared workspace package.
7. **No tests.** There's no `*.test.tsx`/`*.spec.tsx` anywhere in this app,
   and no test runner configured in `package.json`.
8. **`tsconfig.json`'s path aliases point nowhere.** `@components/*`,
   `@lib/*`, `@hooks/*`, `@types/*` all resolve under `./src/*`, but this
   app has no `src/` directory. The code uses relative imports instead.
9. **CSP allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`**
   (`next.config.ts`) — worth tightening if this panel is ever
   internet-facing beyond staff.