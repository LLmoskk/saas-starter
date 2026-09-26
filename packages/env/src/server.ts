import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { loadEnvFile } from "./load-env";
if (!process.env.VERCEL) loadEnvFile();
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    TURNSTILE_SECRET: z.string().min(1),
    TURNSTILE_HOSTNAMES: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().min(1),
    ADMIN_EMAILS: z.string().min(1),
    ADMIN_BETTER_AUTH_URL: z.url().optional(),
    ADMIN_BETTER_AUTH_SECRET: z.string().min(32).optional(),
    WAFFO_MERCHANT_ID: z.string().min(1),
    WAFFO_PRIVATE_KEY: z.string().min(1),
    WAFFO_STORE_ID: z.string().min(1),
    WAFFO_SUCCESS_URL: z.url(),
    WAFFO_ENVIRONMENT: z.enum(["test", "prod"]).default("test"),
    WAFFO_PRODUCTS: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_PUBLIC_BASE_URL: z.url(),
    SENTRY_DSN: z.url().optional(),
  },
  runtimeEnv: {
    ...process.env,
    BETTER_AUTH_URL:
      process.env.BETTER_AUTH_URL ?? (vercelUrl ? `https://${vercelUrl}` : undefined),
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
