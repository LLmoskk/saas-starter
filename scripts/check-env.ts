import { env, services } from "../packages/env/src/server";

// Validate configuration only; never initialize SDKs or connect to services.

if (
  process.env.GITHUB_ACTIONS &&
  (!env.ADMIN_EMAILS || !env.ADMIN_BETTER_AUTH_URL || !env.ADMIN_BETTER_AUTH_SECRET)
) {
  throw new Error(
    "Production admin requires ADMIN_EMAILS, ADMIN_BETTER_AUTH_URL and ADMIN_BETTER_AUTH_SECRET",
  );
}

console.log(
  `Configuration valid: ${
    Object.entries(services)
      .filter(([, config]) => config)
      .map(([name]) => name)
      .join(", ") || "authentication only"
  }`,
);
