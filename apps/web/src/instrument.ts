import * as Sentry from "@sentry/tanstackstart-react";
import { env } from "@starter/env/web";
if (import.meta.env.PROD && typeof window !== "undefined") {
  if (env.VITE_SENTRY_DSN) Sentry.init({ dsn: env.VITE_SENTRY_DSN, tracesSampleRate: 0.1 });
  if (env.VITE_CLARITY_PROJECT_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${env.VITE_CLARITY_PROJECT_ID}`;
    document.head.appendChild(s);
  }
}
