# AI Video Site Template

This branch is a monorepo template for keyword specific AI video websites. Each site in `sites/<name>` owns its code, Cloudflare Worker, D1 database, R2 bucket, domain, users, credits, and Waffo merchant. `sites/demo` provides an image to video example. Shared authentication, payment, database, generation, and UI code lives in `packages/*`. `apps/admin` is a separate admin Worker with its own D1 and login, and can switch between registered sites.

To start locally, copy `sites/demo/env.local.example` and `apps/admin/env.local.example` to their corresponding `env.local` files. Then run `pnpm install`, `pnpm --filter site-demo db:migrate:local`, `pnpm --filter admin db:migrate:local`, and `pnpm dev`. The demo runs on port 3001 and admin on port 3002. Configure a yir model, API key, and USD cost ceiling before enabling generation.

For a new site, copy `sites/demo`, rename its Worker, D1, R2 and Workflow resources, customize its pages and generation flow, and register it in `apps/admin/src/sites.ts`. Each site needs its own environment file. See [deployment](docs/cloudflare.md) and [configuration](docs/configuration.md). Production deploys on pushes to the new repository's `main` branch; D1 migrations run separately.
