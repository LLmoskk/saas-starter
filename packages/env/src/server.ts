import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { loadEnvFile } from "./load-env";
import { resolveEnvProfileFromProcess } from "./load-env";
import { isWorkersRuntime } from "./runtime";
if (!isWorkersRuntime()) loadEnvFile(resolveEnvProfileFromProcess());
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    TURNSTILE_SECRET: z.string().min(1),
    TURNSTILE_HOSTNAMES: z.string().min(1),
    CLOUDFLARE_EMAIL_ACCOUNT_ID: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
    CLOUDFLARE_EMAIL_API_TOKEN: z.string().min(1).optional(),
    EMAIL_FROM_ADDRESS: z.email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).default("Starter"),
    ADMIN_EMAILS: z.string().min(1),
    /** 仅本地开发生效：跳过 Google 登录，直接以该邮箱的已有用户身份进入后台。 */
    ADMIN_DEV_EMAIL: z.email().optional(),
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
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
