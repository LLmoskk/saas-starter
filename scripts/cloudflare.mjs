import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { WORKER_RUNTIME_SECRET_NAMES } from "../packages/env/src/worker-env.ts";

const [action, profile, selectedApp] = process.argv.slice(2);
if (
  !["sync", "deploy"].includes(action) ||
  !["prod", "preview"].includes(profile) ||
  (selectedApp !== undefined && !["web", "admin"].includes(selectedApp))
) {
  throw new Error("Usage: node scripts/cloudflare.mjs <sync|deploy> <prod|preview> [web|admin]");
}
if (profile === "prod" && !process.env.GITHUB_ACTIONS) {
  throw new Error(
    "Production changes run through GitHub Actions; use Preview for local deployments",
  );
}
const apps = selectedApp ? [selectedApp] : ["web", "admin"];
const root = resolve(import.meta.dirname, "..");
const values = parseEnv(readFileSync(resolve(root, `apps/web/env.${profile}`), "utf8"));
const mode = profile === "preview" ? "preview" : "production";
const childEnv = { ...process.env, ...values, STARTER_ENV: profile, CLOUDFLARE_BUILD: "1" };
// Local publishing uses cf OAuth; CI can supply a scoped API token.
if (!process.env.CI) delete childEnv.CLOUDFLARE_API_TOKEN;
// The allowlist includes optional secrets without making deployment require them.
const runtimeSecretNames = new Set(WORKER_RUNTIME_SECRET_NAMES);
const secrets = Object.fromEntries(
  Object.entries(values).filter(([name, value]) => value && runtimeSecretNames.has(name)),
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
  if (result.status !== 0) throw new Error(`Cloudflare command failed (${result.status})`);
}
run(["exec", "tsx", "scripts/check-env.ts"], root);
const targets = new Map();
for (const app of apps) {
  const cwd = resolve(root, `apps/${app}`);
  const { default: configure } = await import(
    pathToFileURL(resolve(cwd, "cloudflare.config.ts")).href
  );
  const config = await configure({ mode, isPreview: false });
  const production = await configure({ mode: "production", isPreview: false });
  const target = config.worker;
  if (!target.name || (profile === "preview" && target.name === production.worker.name)) {
    throw new Error(`Configure an independent ${app} ${profile} Worker name`);
  }
  const hyperdrive = target.env.HYPERDRIVE;
  if (!hyperdrive?.id || /^(0{32}|1{32})$/.test(hyperdrive.id)) {
    throw new Error(
      `Configure ${app} ${profile} Hyperdrive IDs in cloudflare.config.ts before publishing`,
    );
  }
  if (profile === "preview" && hyperdrive.id === production.worker.env.HYPERDRIVE.id) {
    throw new Error(`Preview ${app} must use an independent Hyperdrive binding`);
  }
  targets.set(app, target);
}
const directory = mkdtempSync(join(tmpdir(), "starter-cf-secrets-"));
try {
  for (const app of apps) {
    const cwd = resolve(root, `apps/${app}`);
    const target = targets.get(app);
    const file = join(directory, `${app}.json`);
    if (action === "deploy") {
      writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
      run(["exec", "vite", "build", "--mode", mode], cwd);
      if (profile === "prod") {
        const result = spawnSync(
          "gh",
          ["api", `repos/${process.env.GITHUB_REPOSITORY}/branches/main`, "--jq", ".commit.sha"],
          { cwd: root, encoding: "utf8" },
        );
        if (result.error) throw result.error;
        if (result.status !== 0 || result.stdout.trim() !== process.env.GITHUB_SHA) {
          throw new Error("Superseded by a newer main commit; no deployment was performed");
        }
      }
      run(
        [
          "exec",
          "cf",
          "deploy",
          "--prebuilt",
          "--mode",
          mode,
          "--secrets-file",
          file,
          "--provision=false",
        ],
        cwd,
      );
    } else {
      const payload = {
        secrets: Object.fromEntries(
          Object.entries(secrets).map(([name, text]) => [name, { type: "secret_text", text }]),
        ),
      };
      writeFileSync(file, JSON.stringify(payload), { mode: 0o600 });
      run(
        [
          "exec",
          "cf",
          "workers",
          "secrets",
          "bulk",
          "--worker",
          target.name,
          "--mode",
          mode,
          "--file",
          file,
        ],
        cwd,
      );
    }
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
