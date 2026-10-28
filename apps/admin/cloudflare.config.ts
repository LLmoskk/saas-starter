import { bindings, defineConfig } from "cf/config";
import { WORKER_RUNTIME_SECRET_NAMES } from "@starter/env/worker-env";

export default defineConfig({
  worker: {
    name: "ai-video-admin",
    entrypoint: "src/server.ts",
    compatibilityDate: "2026-10-28",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    observability: { enabled: true },
    env: {
      ...Object.fromEntries(WORKER_RUNTIME_SECRET_NAMES.map((name) => [name, bindings.secret()])),
      DB: bindings.d1({
        name: "ai-video-admin",
        ...(process.env.ADMIN_D1_ID ? { id: process.env.ADMIN_D1_ID } : {}),
      }),
    },
  },
});
