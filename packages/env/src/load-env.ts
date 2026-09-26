import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFile(profile: "local" | "prod" = "local", cwd = process.cwd()) {
  const filename = `env.${profile}`;
  const path = [
    resolve(cwd, filename),
    resolve(cwd, "apps/web", filename),
    resolve(cwd, "../../apps/web", filename),
  ].find(existsSync);
  if (path) config({ path });
  return path;
}
export function resolveEnvProfileFromProcess(): "local" | "prod" {
  return process.env.STARTER_ENV === "prod" ? "prod" : "local";
}
