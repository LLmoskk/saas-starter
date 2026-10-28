import { db } from "@starter/db";
import * as schema from "@starter/db/schema/auth";
import { user } from "@starter/db/schema/auth";
import { env, services } from "@starter/env/server";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { sendEmail } from "./email";

if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL)
  throw new Error("BETTER_AUTH_SECRET and BETTER_AUTH_URL are required for a site");

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  socialProviders: services.google ? { google: services.google } : {},
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password: ${url}`,
        html: `<p><a href="${url}">Reset password</a></p>`,
      });
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [row] = await db
            .select({ disabledAt: user.disabledAt })
            .from(user)
            .where(eq(user.id, session.userId))
            .limit(1);
          if (row?.disabledAt)
            throw APIError.from("FORBIDDEN", {
              code: "ACCOUNT_DISABLED",
              message: "Account unavailable",
            });
        },
      },
    },
  },
  plugins: [
    tanstackStartCookies(),
    ...(services.turnstile
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: services.turnstile.secret,
            endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
            expectedAction: "auth",
            allowedHostnames: services.turnstile.hostnames
              .split(",")
              .map((host) => host.trim())
              .filter(Boolean),
          }),
        ]
      : []),
  ],
});
