import { processWaffoEvent } from "@starter/auth/payments";
import { env } from "@starter/env/server";
import { verifyWebhook, type WebhookEventData } from "@waffo/pancake-ts";
import { createFileRoute } from "@tanstack/react-router";
async function handle(request: Request) {
  const body = await request.text();
  let event;
  try {
    event = verifyWebhook<WebhookEventData>(body, request.headers.get("x-waffo-signature"), {
      environment: env.WAFFO_ENVIRONMENT,
    });
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
  await processWaffoEvent(event);
  return new Response("OK");
}
export const Route = createFileRoute("/api/webhooks/waffo")({
  server: { handlers: { POST: ({ request }) => handle(request) } },
});
