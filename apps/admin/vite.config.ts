import { loadEnvFile } from "@starter/env/load-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
loadEnvFile("local", import.meta.dirname);
export default defineConfig(({ command }) => ({
  server: { port: 3002 },
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact({ compiler: true })],
  ...(command === "build" ? { ssr: { noExternal: true } } : {}),
}));
