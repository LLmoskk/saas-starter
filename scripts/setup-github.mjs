import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";

const root = resolve(import.meta.dirname, "..");
function gh(args, options = {}) {
  const result = spawnSync("gh", args, { cwd: root, encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} failed`);
  return result.stdout?.trim();
}

gh(["auth", "status"], { stdio: "inherit" });
const repository = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
const content = readFileSync(resolve(root, "apps/web/env.prod"), "utf8");
const values = parseEnv(content);
for (const name of ["BETTER_AUTH_URL", "ADMIN_BETTER_AUTH_URL", "ADMIN_BETTER_AUTH_SECRET"]) {
  if (!values[name]) throw new Error(`Configure ${name} in apps/web/env.prod first`);
}
const prompt = createInterface({ input: process.stdin, output: process.stdout });
let account;
try {
  console.log(`GitHub repository: ${repository}`);
  account = process.env.CLOUDFLARE_ACCOUNT_ID ?? (await prompt.question("Cloudflare Account ID: "));
  if (!/^[a-f0-9]{32}$/.test(account))
    throw new Error("Expected a 32-character Cloudflare Account ID");
  const answer = await prompt.question(
    "Configure this repository's production environment? [y/N] ",
  );
  if (!/^y(es)?$/i.test(answer.trim())) process.exit(0);
} finally {
  prompt.close();
}

gh(["api", "--method", "PUT", `repos/${repository}/environments/production`]);
gh(["variable", "set", "CLOUDFLARE_ACCOUNT_ID", "--env", "production", "--body", account]);
gh(["secret", "set", "PRODUCTION_ENV_FILE", "--env", "production"], { input: content });
console.log("Set the Cloudflare API token using GitHub CLI's hidden input:");
gh(["secret", "set", "CLOUDFLARE_API_TOKEN", "--env", "production"], { stdio: "inherit" });
console.log(
  "Configured. Push main to deploy; configuration changes require rerunning this command.",
);
