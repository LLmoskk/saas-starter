import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { loadEnvFile } from "./load-env";
import { resolveEnvProfileFromProcess } from "./load-env";
import { isWorkersRuntime } from "./runtime";
if (!isWorkersRuntime()) loadEnvFile(resolveEnvProfileFromProcess());
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
    GOOGLE_ENABLED: z.enum(["true", "false"]).optional(),
    TURNSTILE_ENABLED: z.enum(["true", "false"]).optional(),
    PAYMENTS_ENABLED: z.enum(["true", "false"]).optional(),
    STORAGE_ENABLED: z.enum(["true", "false"]).optional(),
    EMAIL_ENABLED: z.enum(["true", "false"]).optional(),
    VITE_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    TURNSTILE_SECRET: z.string().min(1).optional(),
    TURNSTILE_HOSTNAMES: z.string().min(1).optional(),
    CLOUDFLARE_EMAIL_ACCOUNT_ID: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
    CLOUDFLARE_EMAIL_API_TOKEN: z.string().min(1).optional(),
    EMAIL_FROM_ADDRESS: z.email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).default("Starter"),
    ADMIN_EMAILS: z.string().min(1).optional(),
    /** 仅本地开发生效：跳过 Google 登录，直接以该邮箱的已有用户身份进入后台。 */
    ADMIN_DEV_EMAIL: z.email().optional(),
    ADMIN_BETTER_AUTH_URL: z.url().optional(),
    ADMIN_BETTER_AUTH_SECRET: z.string().min(32).optional(),
    WAFFO_MERCHANT_ID: z.string().min(1).optional(),
    WAFFO_PRIVATE_KEY: z.string().min(1).optional(),
    WAFFO_STORE_ID: z.string().min(1).optional(),
    WAFFO_SUCCESS_URL: z.url().optional(),
    WAFFO_ENVIRONMENT: z.enum(["test", "prod"]).default("test"),
    WAFFO_PRODUCTS: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
    R2_PUBLIC_BASE_URL: z.url().optional(),
    SENTRY_DSN: z.url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

function service<T extends z.ZodRawShape>(
  name:
    | "GOOGLE_ENABLED"
    | "TURNSTILE_ENABLED"
    | "PAYMENTS_ENABLED"
    | "STORAGE_ENABLED"
    | "EMAIL_ENABLED",
  shape: T,
  values: Record<keyof T, string | undefined>,
) {
  const flag = env[name];
  const enabled = flag === "true" || (flag !== "false" && Object.values(values).some(Boolean));
  if (!enabled) return undefined;
  const result = z.object(shape).safeParse(values);
  if (!result.success)
    throw new Error(
      `${name}: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    );
  return result.data;
}

export const services = {
  google: service(
    "GOOGLE_ENABLED",
    {
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
    },
    { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  ),
  turnstile: service(
    "TURNSTILE_ENABLED",
    {
      secret: z.string().min(1),
      siteKey: z.string().min(1),
      hostnames: z
        .string()
        .refine((value) => value.split(",").some((host) => host.trim()), "Set TURNSTILE_HOSTNAMES"),
    },
    {
      secret: env.TURNSTILE_SECRET,
      siteKey: env.VITE_TURNSTILE_SITE_KEY,
      hostnames: env.TURNSTILE_HOSTNAMES,
    },
  ),
  payments: service(
    "PAYMENTS_ENABLED",
    {
      merchantId: z.string().min(1),
      privateKey: z.string().min(1),
      storeId: z.string().min(1),
      successUrl: z.url(),
      products: z.string().transform((value, context) => {
        try {
          return z
            .array(
              z.object({
                id: z.string().min(1),
                name: z.string().min(1),
                type: z.enum(["onetime", "subscription"]),
              }),
            )
            .min(1)
            .parse(JSON.parse(value));
        } catch {
          context.addIssue({
            code: "custom",
            message: "Set WAFFO_PRODUCTS to a non-empty product array with id, name and type",
          });
          return z.NEVER;
        }
      }),
    },
    {
      merchantId: env.WAFFO_MERCHANT_ID,
      privateKey: env.WAFFO_PRIVATE_KEY,
      storeId: env.WAFFO_STORE_ID,
      successUrl: env.WAFFO_SUCCESS_URL,
      products: env.WAFFO_PRODUCTS,
    },
  ),
  storage: service(
    "STORAGE_ENABLED",
    {
      accountId: z.string().min(1),
      accessKeyId: z.string().min(1),
      secretAccessKey: z.string().min(1),
      bucket: z.string().min(1),
      publicBaseUrl: z.url(),
    },
    {
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET_NAME,
      publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    },
  ),
  email: service(
    "EMAIL_ENABLED",
    {
      accountId: z.string().regex(/^[a-f0-9]{32}$/),
      apiToken: z.string().min(1),
      from: z.email(),
    },
    {
      accountId: env.CLOUDFLARE_EMAIL_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_EMAIL_API_TOKEN,
      from: env.EMAIL_FROM_ADDRESS,
    },
  ),
};
