import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SENTRY_DSN: z.url().optional(),
    VITE_GA_MEASUREMENT_ID: z.string().startsWith("G-").optional(),
    VITE_CLARITY_PROJECT_ID: z.string().min(1).optional(),
    VITE_TURNSTILE_SITE_KEY: z.string().min(1),
    VITE_SITE_NAME: z.string().min(1).optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
