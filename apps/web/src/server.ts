import * as Sentry from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { runInWorkerRequest, type WorkerEnv, type WorkerContext } from "@starter/db/worker";
import { isWorkersRuntime } from "@starter/env/runtime";
import { paraglideMiddleware } from "./paraglide/server.js";

let sentryReady = false;
function ensureSentry() {
  if (sentryReady || !process.env.SENTRY_DSN) return;
  sentryReady = true;
  if (!(isWorkersRuntime() || process.env.NODE_ENV === "production")) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    defaultIntegrations: isWorkersRuntime() ? false : undefined,
    tracesSampleRate: 0.1,
  });
}
export default createServerEntry(
  Sentry.wrapFetchWithSentry({
    async fetch(req: Request, ...rest: unknown[]) {
      // Workers prohibit timer initialization in module scope.
      ensureSentry();
      const bindings = rest[0] as WorkerEnv | undefined;
      const ctx = rest[1] as WorkerContext | undefined;
      const response = await runInWorkerRequest(bindings, () =>
        Sentry.withIsolationScope(() => paraglideMiddleware(req, () => handler.fetch(req))),
      );
      if (isWorkersRuntime() && ctx) ctx.waitUntil(Sentry.flush(2000));
      return response;
    },
  }),
);
