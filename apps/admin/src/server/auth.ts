import {
  isAdminEmail,
  resolveAdminAuthSecret,
  resolveAdminBaseUrl,
} from "@starter/admin/server-config";
import { db } from "@starter/db";
import * as schema from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const baseURL = resolveAdminBaseUrl();

export const adminAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: resolveAdminAuthSecret(),
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
