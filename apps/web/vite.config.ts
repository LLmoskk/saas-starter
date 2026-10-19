import { loadEnvFile, resolveEnvProfileFromProcess } from "@starter/env/load-env";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
loadEnvFile(resolveEnvProfileFromProcess(), import.meta.dirname);
export default defineConfig(({ command, isPreview }) => ({
  server: { port: 3001 },
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      emitTsDeclarations: true,
      strategy: ["url", "cookie", "baseLocale"],
    }),
    tailwindcss(),
    ...(command === "build" || isPreview || process.env.CLOUDFLARE_BUILD === "1"
      ? [cloudflare({ viteEnvironment: { name: "ssr" }, types: { includeRuntime: false } })]
      : []),
    tanstackStart(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            errorHandler: (error) => console.warn("[sentry]", error),
            sourcemaps: {
              assets: ["./.cloudflare/output/v0/**/*.map"],
              filesToDeleteAfterUpload: ["./.cloudflare/output/v0/workers/default/bundle/**/*.map"],
            },
          }),
        ]
      : []),
    viteReact({ compiler: true }),
  ],
  ...(command === "build"
    ? {
        build: { sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false },
        environments: {
          ssr: { build: { sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false } },
        },
        ssr: {
          noExternal: true,
          resolve: {
            conditions: ["workerd", "worker", "browser"],
            mainFields: ["browser", "module", "main"],
          },
        },
      }
    : {}),
}));
