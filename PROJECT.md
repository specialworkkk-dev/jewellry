# Jewellry — Multi-Tenant Digital Storefront for Gold & Jewellery Shops

A SaaS web app where jewellery shop owners get a premium, social-media-style storefront at a unique public URL (`/shop/<slug>`), publish products, posts, stories and ads, and receive customer enquiries. A platform admin approves shops, manages plans and monitors infrastructure.

## Features

**Public storefront (`/shop/[slug]`)**
- Cinematic hero, product catalogue, product detail pages with gallery
- Posts feed and Instagram-style stories viewer
- Likes / favourites, share button, QR-code sharing
- Enquiry form (WhatsApp-oriented)
- Live gold-rate display
- Per-shop PWA install (dynamic manifest and icons) and Open Graph images
- Shop-specific web push notification opt-in
- Browsing requires no login

**Shop owner dashboard (`/dashboard`)**
- Products (create, edit, delete, pagination), media library, marketing
- Enquiries inbox
- Shop settings, notification settings (event toggles plus 50 reusable templates)
- Plan limits and renewal reminders

**Platform admin (`/admin`)**
- Shop list, detail and approval
- User management
- Platform settings (including gold rate updater)
- Infrastructure monitoring page (MongoDB, Cloudflare R2, Vercel, Ably usage vs. budget)

**Cross-cutting**
- English / local-language i18n (`src/i18n`)
- Realtime updates through Ably
- Rate limiting (Upstash Redis, with in-memory fallback)
- Analytics event tracking and unique visitor counting
- Daily infrastructure cron job

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.3 (App Router, `proxy.ts`), React 19.2 |
| Language | TypeScript 5 |
| Styling / UI | Tailwind CSS 4, `@base-ui/react`, class-variance-authority, lucide-react, framer-motion |
| Database | MongoDB via Mongoose 9 |
| Auth | NextAuth v4 (credentials, JWT sessions), bcryptjs |
| Storage | Cloudflare R2 (S3 SDK, presigned uploads) |
| Realtime | Ably (capability-scoped tokens) |
| Push | `web-push` (VAPID) |
| Hosting | Vercel (cron in `vercel.json`) |

> **Note:** this Next.js version has breaking changes from older releases. See [AGENTS.md](AGENTS.md) and read `node_modules/next/dist/docs/` before changing framework-level code.

## Roles

`SUPER_ADMIN`, `PLATFORM_ADMIN`, `SHOP_OWNER`, `CUSTOMER` (see `src/models/User.ts`).

[src/proxy.ts](src/proxy.ts) forces the canonical production origin. It also redirects logged-in users from `/` and `/login`: owners go to `/dashboard`, admins go to `/admin`.

## Project Structure

```
src/
├── app/
│   ├── admin/          # Platform admin: shops, users, settings, infrastructure
│   ├── dashboard/      # Owner: products, enquiries, media, marketing, settings
│   ├── shop/[slug]/    # Public storefront, product pages, OG image
│   ├── login, register # Auth pages
│   ├── api/            # REST routes (see below)
│   └── sitemap.ts, robots.ts, manifest.webmanifest, sw.js
├── components/         # admin/, public/, shop/, realtime/, ui/
├── hooks/              # useInteraction
├── i18n/               # translations, owner-translations, useLocale
├── lib/                # auth, db, plan, pricing, R2, realtime, push, rate-limit, tenant, ...
├── models/             # Mongoose models
└── types/              # next-auth type augmentation
tests/                  # Unit tests (rate-limit, retry)
scripts/                # load-test.mjs, auth-persistence-test.mjs
```

### API routes (`src/app/api`)
`auth` (NextAuth, register), `products`, `categories`, `posts`, `stories`, `advertisements`, `enquiries`, `interactions`, `analytics/track`, `upload/url` and `upload/file`, `notifications/subscriptions`, `realtime/auth`, `pwa/[app]/manifest.json`, `shop/[slug]/manifest.json` and `icon/[size]`, `admin/shops/[id]/approve`, `cron/infrastructure`.

### Data models (`src/models`)
`User`, `Shop` (plan limits: max products, photos and videos per day, video duration, link opens, approval and active flags), `Product`, `Category`, `Post`, `Advertisement`, `Enquiry`, `Interaction`, `AnalyticsEvent`, `ShopVisitor`, `PushSubscription`, `ShopNotificationSettings`, `NotificationJob`, `PlatformSettings`, `InfrastructureSnapshot`.

## Getting Started

### Prerequisites
- Node.js 20+
- A MongoDB database (Atlas or local)
- Cloudflare R2 bucket (for media uploads)
- Optional: Ably, Upstash Redis and VAPID keys

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

See [.env.example](.env.example) for the full list.

| Group | Variables |
|---|---|
| App / DB | `MONGODB_URI`, `MONGODB_*` pool and timeout settings, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL` |
| Rate limiting (optional) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| R2 storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_DEV_URL` |
| Monitoring | `CLOUDFLARE_API_TOKEN`, `VERCEL_ACCESS_TOKEN`, `VERCEL_TEAM_ID`, `CRON_SECRET`, `INFRA_*`, `USD_TO_INR_RATE`, `MONGODB_STORAGE_LIMIT_MB`, `R2_FREE_*` |
| Realtime | `ABLY_API_KEY` (server-only), `ABLY_CONNECTION_LIMIT`, `ABLY_MONTHLY_MESSAGE_LIMIT` |
| Web push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (generate with `npm run generate:vapid`) |

Never expose `ABLY_API_KEY` or `VAPID_PRIVATE_KEY` with a `NEXT_PUBLIC_` prefix.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (webpack) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run test:unit` | Unit tests (`tests/*.test.mjs`) |
| `npm run test:load` | Load test (`scripts/load-test.mjs`) |
| `npm run test:auth-persistence` | Session persistence test |
| `npm run generate:vapid` | Generate VAPID keys |

Maintenance scripts at the repo root (run with `.env.local` loaded): `seed.ts` (seed users and shops), `check_db.ts`, `delete_orphans.ts` (removes users without a shop), `publish_products.ts` (marks all products published) and `set-r2-cors.mjs` (configures the R2 bucket CORS for `NEXTAUTH_URL`). The last three modify data or configuration, so check the target environment first.

## Deployment

Deployed on Vercel. [vercel.json](vercel.json) schedules `/api/cron/infrastructure` daily at 03:00 UTC. Set all production environment variables, including `CRON_SECRET`, `ABLY_API_KEY` and the VAPID keys. Redeploy after changing them. In production, requests to non-canonical hostnames are redirected to the configured origin so auth cookies stay consistent.

## Further Reading

- [special.md](special.md): the original product "master prompt" (full requirements, about 4,300 lines)
- [README.md](README.md): realtime (Ably) and push notification setup notes
