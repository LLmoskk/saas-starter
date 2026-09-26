import { db } from "@starter/db";
import { payment, subscription, webhookEvent } from "@starter/db/schema/payment";
import { user } from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { WaffoPancake, WebhookEventType, type WebhookEvent } from "@waffo/pancake-ts";
import { eq } from "drizzle-orm";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["onetime", "subscription"]),
});
export const products = z.array(productSchema).parse(JSON.parse(env.WAFFO_PRODUCTS));
export const waffoClient = new WaffoPancake({
  merchantId: env.WAFFO_MERCHANT_ID,
  privateKey: env.WAFFO_PRIVATE_KEY,
  environment: env.WAFFO_ENVIRONMENT,
});
export async function createCheckout(userId: string, email: string, productId: string) {
  const product = products.find((x) => x.id === productId);
  if (!product) throw new Error("Unknown product");
  const result = await waffoClient.checkout.authenticated.create({
    productId: product.id,
    currency: "USD",
    buyerIdentity: userId,
    buyerEmail: email,
    successUrl: env.WAFFO_SUCCESS_URL,
    metadata: { userId, productId: product.id },
    orderMerchantExternalId: `${userId}:${crypto.randomUUID()}`,
  });
  return { checkoutUrl: result.checkoutUrl, sessionId: result.sessionId };
}
const subscriptionStates: Record<string, string> = {
  [WebhookEventType.SubscriptionActivated]: "active",
  [WebhookEventType.SubscriptionRenewed]: "active",
  [WebhookEventType.SubscriptionRecovered]: "active",
  [WebhookEventType.SubscriptionUncanceled]: "active",
  [WebhookEventType.SubscriptionPlanChanged]: "active",
  [WebhookEventType.SubscriptionCanceling]: "canceling",
  [WebhookEventType.SubscriptionCanceled]: "canceled",
  [WebhookEventType.SubscriptionPastDue]: "past_due",
};
export async function processWaffoEvent(event: WebhookEvent) {
  const data = event.data;
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(webhookEvent)
      .values({ id: event.id, eventType: event.eventType })
      .onConflictDoNothing()
      .returning({ id: webhookEvent.id });
    if (!inserted.length) return;
    const userId = data.merchantProvidedBuyerIdentity || data.orderMetadata?.userId;
    if (!userId) throw new Error(`Webhook ${event.id} has no user identity`);
    const [buyer] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
    if (!buyer) throw new Error(`Webhook ${event.id} references unknown user`);
    const status = subscriptionStates[event.eventType];
    if (status) {
      await tx
        .insert(subscription)
        .values({
          orderId: data.orderId,
          userId,
          productId: data.orderMetadata?.productId ?? null,
          productName: data.productName,
          status,
          currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
        })
        .onConflictDoUpdate({
          target: subscription.orderId,
          set: {
            status,
            productName: data.productName,
            currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
            updatedAt: new Date(),
          },
        });
    }
    if (
      event.eventType === WebhookEventType.OrderCompleted ||
      event.eventType === WebhookEventType.SubscriptionActivated ||
      event.eventType === WebhookEventType.SubscriptionRenewed ||
      event.eventType === WebhookEventType.SubscriptionRecovered
    ) {
      const id = data.paymentId?.trim() || `${event.id}:payment`;
      await tx
        .insert(payment)
        .values({
          id: crypto.randomUUID(),
          userId,
          orderId: data.orderId,
          paymentId: id,
          productId: data.orderMetadata?.productId ?? null,
          productName: data.productName,
          amount: data.amount == null ? null : String(data.amount),
          currency: data.currency,
          status: "completed",
          paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        })
        .onConflictDoNothing({ target: payment.paymentId });
    }
    if (event.eventType === WebhookEventType.RefundSucceeded) {
      await tx
        .update(payment)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(payment.orderId, data.orderId));
    }
  });
}
