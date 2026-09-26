import { loadEnvFile } from "@starter/env/load-env";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
loadEnvFile("local", import.meta.dirname);
export default defineConfig(({ command }) => ({
  server: { port: 3001 },
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      emitTsDeclarations: true,
    }),
    tailwindcss(),
    tanstackStart(),
    ...sentryTanstackStart({ errorHandler: (error) => console.warn("[sentry]", error) }),
    nitro(),
    viteReact({ compiler: true }),
  ],
  ...(command === "build" ? { ssr: { noExternal: true } } : {}),
}));
