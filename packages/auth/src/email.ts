import { env, services } from "@starter/env/server";
import Cloudflare from "cloudflare";

type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

// ponytail: REST keeps the same transport in Workers and local Node development.
export async function sendEmail(input: Email) {
  const config = services.email;
  if (!config) throw new Error("Email is not enabled");

  const client = new Cloudflare({ apiToken: config.apiToken, maxRetries: 0, timeout: 15_000 });
  const result = await client.emailSending.send({
    account_id: config.accountId,
    from: { address: config.from, name: env.EMAIL_FROM_NAME },
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    reply_to: input.replyTo,
  });
  if (!result.delivered?.length && !result.queued?.length) {
    throw new Error("Cloudflare email was not accepted for delivery");
  }
}
