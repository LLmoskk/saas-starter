import { loadEnvFile, resolveEnvProfileFromProcess } from "@starter/env/load-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
loadEnvFile(resolveEnvProfileFromProcess(), import.meta.dirname);
// 端口以 ADMIN_BETTER_AUTH_URL 为唯一来源，避免 OAuth 回调与 dev server 端口不一致。
const adminPort = (() => {
  const url = process.env.ADMIN_BETTER_AUTH_URL;
  return url ? Number(new URL(url).port) || 3002 : 3002;
})();
export default defineConfig(({ command, isPreview }) => ({
  server: { port: adminPort },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    ...(command === "build" || isPreview || process.env.CLOUDFLARE_BUILD === "1"
      ? [cloudflare({ viteEnvironment: { name: "ssr" }, types: { includeRuntime: false } })]
      : []),
    tanstackStart(),
    viteReact({ compiler: true }),
  ],
  ...(command === "build"
    ? {
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
