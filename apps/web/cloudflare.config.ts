import { bindings, defineConfig } from "cf/config";
import { WORKER_REQUIRED_SECRET_NAMES } from "@starter/env/worker-env";

export default defineConfig((ctx) => {
  if (ctx.mode && !["development", "production", "preview"].includes(ctx.mode)) {
    throw new Error("Unsupported Cloudflare mode");
  }
  const isolated = ctx.mode === "preview";
  return {
    worker: {
      name: isolated ? "saas-starter-web-preview" : "saas-starter-web",
      entrypoint: "src/server.ts",
      compatibilityDate: "2026-10-07",
      compatibilityFlags: ["nodejs_compat"],
      workersDev: true,
      previewUrls: false,
      observability: { enabled: true },
      env: {
        ...Object.fromEntries(
          WORKER_REQUIRED_SECRET_NAMES.map((name) => [name, bindings.secret()]),
        ),
        HYPERDRIVE: bindings.hyperdrive({
          id: isolated ? "11111111111111111111111111111111" : "00000000000000000000000000000000",
          dev: {
            connectionString:
              process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
              "postgresql://postgres:password@localhost:5433/starter",
          },
        }),
      },
    },
  };
});
