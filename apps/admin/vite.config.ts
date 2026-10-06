import { loadEnvFile, resolveEnvProfileFromProcess } from "@starter/env/load-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
loadEnvFile(resolveEnvProfileFromProcess(), import.meta.dirname);
export default defineConfig(({ command, isPreview }) => ({
  server: { port: 3002 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    ...(command === "build" || isPreview ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
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
