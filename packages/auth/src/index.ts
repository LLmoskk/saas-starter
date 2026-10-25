import { db } from "@starter/db";
import * as schema from "@starter/db/schema/auth";
import { user } from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { sendEmail } from "./email";

const hostnames = env.TURNSTILE_HOSTNAMES.split(",")
  .map((x) => x.trim())
  .filter(Boolean);
if (!hostnames.length) throw new Error("TURNSTILE_HOSTNAMES is required");
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.BETTER_AUTH_URL],
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
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
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: env.TURNSTILE_SECRET,
      endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
      expectedAction: "auth",
      allowedHostnames: hostnames,
    }),
  ],
});
