import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const [action, profile] = process.argv.slice(2);
if (!["sync", "deploy"].includes(action) || !["prod", "preview"].includes(profile)) {
  throw new Error("Usage: node scripts/cloudflare.mjs <sync|deploy> <prod|preview>");
}
const root = resolve(import.meta.dirname, "..");
const values = parseEnv(readFileSync(resolve(root, `apps/web/env.${profile}`), "utf8"));
const workerEnv = profile === "preview" ? "preview" : "";
const childEnv = { ...process.env, ...values, STARTER_ENV: profile, CLOUDFLARE_ENV: workerEnv };
// Local publishing uses Wrangler OAuth; CI can supply a scoped API token.
if (!process.env.CI) delete childEnv.CLOUDFLARE_API_TOKEN;
// Database credentials stay in Hyperdrive; browser variables are compiled into assets.
const secrets = Object.fromEntries(
  Object.entries(values).filter(
    ([key, value]) =>
      value &&
      !key.startsWith("VITE_") &&
      !key.startsWith("CLOUDFLARE_") &&
      ![
        "DATABASE_URL",
        "SENTRY_AUTH_TOKEN",
        "SENTRY_ORG",
        "SENTRY_PROJECT",
        "STARTER_ENV",
        "SKIP_ENV_VALIDATION",
      ].includes(key),
  ),
);
for (const key of ["BETTER_AUTH_URL", "ADMIN_BETTER_AUTH_URL", "ADMIN_BETTER_AUTH_SECRET"]) {
  if (!values[key]) throw new Error(`Missing ${key} in env.${profile}`);
}
for (const key of ["BETTER_AUTH_URL", "ADMIN_BETTER_AUTH_URL"]) {
  if (new URL(values[key]).protocol !== "https:") throw new Error(`${key} must use HTTPS`);
}
function run(args, cwd, input) {
  const result = spawnSync("pnpm", args, {
    cwd,
    env: childEnv,
    input,
    encoding: "utf8",
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const workerNames = new Map();
for (const app of ["web", "admin"]) {
  const cwd = resolve(root, `apps/${app}`);
  const config = JSON.parse(readFileSync(resolve(cwd, "wrangler.jsonc"), "utf8"));
  const target = workerEnv ? config.env[workerEnv] : config;
  if (!target.name || (profile === "preview" && target.name === config.name)) {
    throw new Error(`Configure an independent ${app} ${profile} Worker name`);
  }
  workerNames.set(app, target.name);
  if (
    !target.hyperdrive?.length ||
    target.hyperdrive.some(({ id }) => !id || /^(0{32}|1{32})$/.test(id))
  ) {
    throw new Error(`Configure ${app} ${profile} Hyperdrive IDs before publishing`);
  }
  if (
    profile === "preview" &&
    target.hyperdrive.some(({ id }) => config.hyperdrive.some((binding) => binding.id === id))
  ) {
    throw new Error(`Preview ${app} must use an independent Hyperdrive binding`);
  }
}
if (action === "deploy") run(["build"], root);
for (const app of ["web", "admin"]) {
  const cwd = resolve(root, `apps/${app}`);
  run(
    [
      "exec",
      "wrangler",
      "secret",
      "bulk",
      "--config",
      "wrangler.jsonc",
      "--env",
      workerEnv,
      "--name",
      workerNames.get(app),
    ],
    cwd,
    JSON.stringify(secrets),
  );
  if (action === "deploy")
    run(["exec", "wrangler", "deploy", "--config", "dist/server/wrangler.json"], cwd);
}
