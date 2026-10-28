import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { WORKER_RUNTIME_SECRET_NAMES } from "../packages/env/src/worker-env.ts";

const [action, profile, target] = process.argv.slice(2);
if (
  !["deploy", "sync"].includes(action) ||
  profile !== "prod" ||
  !target ||
  !/^(sites\/[a-z0-9-]+|apps\/admin)$/.test(target)
)
  throw new Error("Usage: node scripts/cloudflare.mjs <deploy|sync> prod <sites/name|apps/admin>");
if (!process.env.GITHUB_ACTIONS) throw new Error("Production changes run through GitHub Actions");

const root = resolve(import.meta.dirname, "..");
const cwd = resolve(root, target);
const file = resolve(cwd, "env.prod");
if (!existsSync(resolve(cwd, "cloudflare.config.ts")) || !existsSync(file))
  throw new Error(`Missing Cloudflare config or env.prod for ${target}`);
const values = parseEnv(readFileSync(file, "utf8"));
const isAdmin = target === "apps/admin";
const idKey = `${isAdmin ? "ADMIN" : basename(target).toUpperCase().replaceAll("-", "_")}_D1_ID`;
const required = isAdmin
  ? ["ADMIN_BETTER_AUTH_SECRET", "ADMIN_BETTER_AUTH_URL", "ADMIN_EMAILS", idKey]
  : ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "SITE_ADMIN_TOKEN", idKey];
for (const key of required) if (!values[key]) throw new Error(`${target}: missing ${key}`);
const authUrl = values[isAdmin ? "ADMIN_BETTER_AUTH_URL" : "BETTER_AUTH_URL"];
if (new URL(authUrl).protocol !== "https:")
  throw new Error(`${target}: production auth URL must use HTTPS`);
if (!/^[a-f0-9-]{36}$/.test(values[idKey]) || /^0{8}-/.test(values[idKey]))
  throw new Error(`${target}: configure an actual D1 database ID`);
const childEnv = { ...process.env, ...values, STARTER_ENV: "prod", CLOUDFLARE_BUILD: "1" };
const runtime = new Set(WORKER_RUNTIME_SECRET_NAMES);
const secrets = Object.fromEntries(
  Object.entries(values).filter(([key, value]) => runtime.has(key) && value),
);
const temporary = mkdtempSync(join(tmpdir(), "video-cf-"));
function run(args) {
  const result = spawnSync("pnpm", args, { cwd, env: childEnv, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${target}: command failed (${result.status})`);
}
try {
  const secretFile = join(temporary, "secrets.json");
  if (action === "deploy") {
    writeFileSync(secretFile, JSON.stringify(secrets), { mode: 0o600 });
    run(["exec", "cf", "build"]);
    run([
      "exec",
      "cf",
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--secrets-file",
      secretFile,
      "--provision=false",
    ]);
  } else {
    const { default: configure } = await import(resolve(cwd, "cloudflare.config.ts"));
    const config = await configure({ mode: "production", isPreview: false });
    writeFileSync(
      secretFile,
      JSON.stringify({
        secrets: Object.fromEntries(
          Object.entries(secrets).map(([key, text]) => [key, { type: "secret_text", text }]),
        ),
      }),
      { mode: 0o600 },
    );
    run([
      "exec",
      "cf",
      "workers",
      "secrets",
      "bulk",
      "--worker",
      config.worker.name,
      "--mode",
      "production",
      "--file",
      secretFile,
    ]);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
