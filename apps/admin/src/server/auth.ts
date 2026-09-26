import { db } from "@starter/db";
import * as schema from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
export const isAdminEmail = (email: string) =>
  env.ADMIN_EMAILS.split(",")
    .map((x) => x.trim().toLowerCase())
    .includes(email.trim().toLowerCase());
if (process.env.VERCEL && (!env.ADMIN_BETTER_AUTH_URL || !env.ADMIN_BETTER_AUTH_SECRET)) {
  throw new Error(
    "Configure independent ADMIN_BETTER_AUTH_URL and ADMIN_BETTER_AUTH_SECRET before deployment",
  );
}
const baseURL = env.ADMIN_BETTER_AUTH_URL ?? "http://localhost:3002";
export const adminAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.ADMIN_BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL],
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
  advanced: { cookiePrefix: "starter-admin" },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAdminEmail(user.email))
            throw new APIError("FORBIDDEN", { message: "Not an administrator" });
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
});
