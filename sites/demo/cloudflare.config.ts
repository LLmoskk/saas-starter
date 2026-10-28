import { bindings, defineConfig, exports } from "cf/config";
import { WORKER_RUNTIME_SECRET_NAMES } from "@starter/env/worker-env";

export default defineConfig({
  worker: {
    name: "ai-video-demo",
    entrypoint: "src/server.ts",
    compatibilityDate: "2026-10-28",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    observability: { enabled: true },
    exports: {
      GenerationWorkflow: exports.workflow({ name: "ai-video-demo-generation" }),
    },
    env: {
      ...Object.fromEntries(WORKER_RUNTIME_SECRET_NAMES.map((name) => [name, bindings.secret()])),
      DB: bindings.d1({
        name: "ai-video-demo",
        ...(process.env.DEMO_D1_ID ? { id: process.env.DEMO_D1_ID } : {}),
      }),
      MEDIA: bindings.r2({ name: "ai-video-demo-media" }),
      GENERATION_WORKFLOW: bindings.workflow({
        name: "ai-video-demo-generation",
        worker: "ai-video-demo",
        exportName: "GenerationWorkflow",
      }),
    },
  },
});
