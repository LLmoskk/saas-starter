import { randomUUID } from "node:crypto";
import type { Plugin } from "vite";

// A fresh identity per build also detects local releases with uncommitted changes.
// Cloudflare/Vite can load the configuration more than once in the same build.
export const buildVersion = (process.env.APP_BUILD_VERSION ??= randomUUID());

export function buildVersionPlugin(version: string): Plugin {
  return {
    name: "app-build-version",
    apply: "build",
    generateBundle() {
      if (this.environment.name !== "client") return;
      const clientVersion = this.environment.config.define?.["import.meta.env.VITE_BUILD_VERSION"];
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({
          version: clientVersion ? JSON.parse(String(clientVersion)) : version,
        }),
      });
    },
  };
}
