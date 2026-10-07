# SaaS Starter

English | [简体中文](./README.md)

A personal SaaS starter with separate user and admin apps sharing authentication, database, payment, and storage modules. Copy it to start a new product, then replace the branding, products, business entitlements, and legal copy.

## Tech stack

| Layer                    | Technology and purpose                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Language and runtime     | TypeScript, Node.js 24, React 19                                                        |
| Workspace                | pnpm 11 workspaces and Turborepo for two apps and shared packages                       |
| Web framework            | TanStack Start / Router for file routes, server rendering, and server endpoints         |
| Build and deployment     | Vite, Cloudflare Workers; separate deployments for web and admin                        |
| Styling                  | Tailwind CSS 4                                                                          |
| Business APIs            | oRPC + TanStack Query for typed APIs and client query caching; Zod for input validation |
| Authentication           | Better Auth with the Drizzle database adapter                                           |
| Database                 | PostgreSQL and Drizzle ORM / Kit; Docker Compose runs PostgreSQL 18 locally             |
| Localization and content | Paraglide for Chinese and English messages; React Markdown + remark-gfm for blogs       |
| Code checks              | Oxlint, Oxfmt, TypeScript                                                               |
| Environment variables    | @t3-oss/env-core + Zod for server and browser configuration                             |

## Infrastructure integrations

| Capability                 | Service / implementation                                             | Current scope                                                                                                        |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| User authentication        | Better Auth, Google OAuth                                            | Email sign-up and sign-in, Google sign-in, password reset with session revocation                                    |
| Bot protection             | Cloudflare Turnstile                                                 | Validation for email sign-up, sign-in, and password reset, including action and allowed hostnames                    |
| Transactional email        | Resend                                                               | Password reset emails; requires an API key, sender, and verified sending domain                                      |
| Payments and subscriptions | Waffo Pancake SDK                                                    | One-time and subscription checkout, signed webhook verification, event deduplication, order and subscription storage |
| Image storage              | Cloudflare R2, AWS S3 SDK                                            | Admin requests presigned PUT URLs for blog images, served through a public domain                                    |
| Admin app                  | Separate Better Auth sessions, email allowlist                       | Enable or disable users, view payments and subscriptions, manage blogs, view audit logs                              |
| Error monitoring           | Sentry                                                               | Browser and server integration in the web app; requires DSNs; build plugin included                                  |
| Analytics                  | Google Analytics 4, Microsoft Clarity                                | Web app loads traffic and session analytics scripts when configured                                                  |
| Content and SEO            | Chinese and English blogs, Markdown, sitemap, robots, basic metadata | Blog publishing and basic search engine configuration                                                                |

The payment module does not implement credits, quotas, or membership permissions. Each product must grant and revoke entitlements based on confirmed order and subscription states and define its refund rules. Sentry, GA4, and Clarity integrations require their configuration to become active.

## Project structure

```text
apps/
  web/          # User app, localhost:3001
  admin/        # Admin app, localhost:3002
packages/
  api/          # Web oRPC routes and context
  auth/         # User authentication, Waffo checkout and event processing
  db/           # Database connection, schemas, Drizzle and local database
  env/          # Environment loading and validation
  storage/      # Presigned R2 uploads for blog images
  config/       # Shared TypeScript configuration
```

Admin oRPC routes live in `apps/admin/src/server`. Both apps share a database, while the admin app uses its own authentication URL, secret, and cookie prefix.

## Local setup

Install Node.js 24, pnpm 11.26.0, and Docker.

```bash
pnpm install
cp apps/web/env.local.example apps/web/env.local
```

Fill in `apps/web/env.local`, then run:

```bash
pnpm db:start
pnpm db:push
pnpm dev
```

Open <http://localhost:3001> for the user app and <http://localhost:3002> for the admin app. Local PostgreSQL listens on `localhost:5433`. The admin app also loads the web app's `env.local` by default; create `apps/admin/env.local` for app-specific values.

Replace the empty values in the example file. Environment validation currently requires Google, Turnstile, Resend, Waffo, and R2 settings. A database URL alone is insufficient to start the complete app.

## Service configuration

Use [`apps/web/env.local.example`](./apps/web/env.local.example) as the configuration reference.

- Database and authentication: set `DATABASE_URL`, `BETTER_AUTH_URL`, and a `BETTER_AUTH_SECRET` of at least 32 characters. Production admin deployments require separate `ADMIN_BETTER_AUTH_URL` and `ADMIN_BETTER_AUTH_SECRET` values. Separate `ADMIN_EMAILS` entries with commas.
- Google OAuth: set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register `/api/auth/callback/google` callback URLs for both apps.
- Turnstile: set `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`, and comma-separated `TURNSTILE_HOSTNAMES`. Configure the app domains in the service dashboard.
- Resend: set `RESEND_API_KEY` and `RESEND_FROM` with a verified sending domain.
- Waffo: configure the merchant ID, private key, store ID, success URL, and `WAFFO_ENVIRONMENT`, which accepts `test` or `prod`. `WAFFO_PRODUCTS` is a JSON array with `id`, `name`, and `type`; types are `onetime` or `subscription`. Send webhooks to `https://<web-domain>/api/webhooks/waffo`.
- See [Waffo integration](docs/waffo.md#english) for authenticated plan changes, webhook subscriptions, and idempotency rules.
- R2: configure the account ID, access credentials, bucket, and `R2_PUBLIC_BASE_URL`. Allow PUT requests from upload origins in the bucket CORS settings and verify that public image URLs work.
- Monitoring and analytics: use `VITE_SENTRY_DSN` for the browser and `SENTRY_DSN` for the server. Sentry build configuration uses `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`. GA4 and Clarity use `VITE_GA_MEASUREMENT_ID` and `VITE_CLARITY_PROJECT_ID` respectively.

Variables prefixed with `VITE_` enter the browser build. Use that prefix only for public configuration, never for server secrets.

## Commands

| Command                          | Purpose                                            |
| -------------------------------- | -------------------------------------------------- |
| `pnpm dev`                       | Start both apps                                    |
| `pnpm build`                     | Build apps through Turborepo                       |
| `pnpm check-types`               | Run type checks                                    |
| `pnpm check`                     | Run Oxlint and Oxfmt checks                        |
| `pnpm db:start` / `pnpm db:stop` | Start / stop the local database                    |
| `pnpm db:push`                   | Sync the current schema to the configured database |
| `pnpm db:studio`                 | Open Drizzle Studio                                |

## New projects and deployment

1. Start with fresh Git history. Update package names, site name, homepage, app page, and styles.
2. Use the new project's service accounts, domains, secrets, and storage buckets. Configure products and implement entitlements.
3. Add legal pages, privacy disclosures, and refund rules. Verify webhook fields and subscription states in the live payment environment before accepting payments.
4. Follow the [Cloudflare deployment guide](docs/cloudflare.md) to configure web/admin Workers, Hyperdrive, and Production / Preview environments. Browser variables must exist before building.
5. For schema changes, run `pnpm db:push` with the target environment's `DATABASE_URL`. Confirm the database target before running it.
6. Verify the new domain in Google Search Console and submit `/sitemap.xml`.
