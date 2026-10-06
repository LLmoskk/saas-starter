import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFile(profile: "local" | "prod" | "preview" = "local", cwd = process.cwd()) {
  const filename = `env.${profile}`;
  const path = [
    resolve(cwd, filename),
    resolve(cwd, "apps/web", filename),
    resolve(cwd, "../../apps/web", filename),
  ].find(existsSync);
  if (path) config({ path });
  return path;
}
export function resolveEnvProfileFromProcess(): "local" | "prod" | "preview" {
  const profile = process.env.STARTER_ENV;
  return profile === "prod" || profile === "preview" ? profile : "local";
}
