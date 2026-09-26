import * as Sentry from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./paraglide/server.js";
if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN)
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
export default createServerEntry(
  Sentry.wrapFetchWithSentry({
    fetch(req: Request) {
      return Sentry.withIsolationScope(() => paraglideMiddleware(req, () => handler.fetch(req)));
    },
  }),
);
