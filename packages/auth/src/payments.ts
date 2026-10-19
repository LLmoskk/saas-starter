import { db } from "@starter/db";
import { payment, subscription, webhookEvent } from "@starter/db/schema/payment";
import { user } from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { ChangeTiming, WaffoPancake, WebhookEventType, type WebhookEvent } from "@waffo/pancake-ts";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { OPEN_SUBSCRIPTION_STATUSES, WAFFO_CONSUMER_PORTAL_URL } from "./payment-contract";

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
  const openSubscriptions =
    product.type === "subscription"
      ? await db
          .select()
          .from(subscription)
          .where(
            and(
              eq(subscription.userId, userId),
              inArray(subscription.status, [...OPEN_SUBSCRIPTION_STATUSES]),
            ),
          )
      : [];
  const origin = openSubscriptions[0];
  if (
    origin &&
    (openSubscriptions.length !== 1 ||
      origin.status === "past_due" ||
      !origin.orderId.startsWith("ORD_"))
  ) {
    return { checkoutUrl: WAFFO_CONSUMER_PORTAL_URL, sessionId: null, kind: "portal" as const };
  }
  if (origin?.productId === product.id) throw new Error("This is your current plan");
  const common = {
    productId: product.id,
    currency: "USD",
    buyerIdentity: userId,
    successUrl: env.WAFFO_SUCCESS_URL,
    metadata: { userId, productId: product.id },
    orderMerchantExternalId: `checkout-${crypto.randomUUID()}`,
  };
  const options = { idempotencyKey: `checkout-${crypto.randomUUID()}` };
  const result = origin
    ? await waffoClient.checkout.authenticated.createPlanChange(
        {
          ...common,
          originOrderId: origin.orderId,
          // Waffo derives the timing; within the final day use next period explicitly.
          ...(origin.currentPeriodEnd && origin.currentPeriodEnd.getTime() - Date.now() < 86_400_000
            ? { changeTiming: ChangeTiming.NextPeriod }
            : {}),
        },
        options,
      )
    : await waffoClient.checkout.authenticated.create({ ...common, buyerEmail: email }, options);
  const checkoutUrl = new URL(result.checkoutUrl);
  if (env.WAFFO_ENVIRONMENT === "test") checkoutUrl.searchParams.set("test", "true");
  return {
    checkoutUrl: checkoutUrl.href,
    sessionId: result.sessionId,
    kind: origin ? ("plan-change" as const) : ("checkout" as const),
  };
}
/**
 * 新项目的 Waffo 店铺应当订阅的全部事件，配置 webhook 时以这里为唯一真相源。
 *
 * 与下面的 `processWaffoEvent` 一一对应：少订阅一个，对应事件就永远收不到，典型症状是
 * 「付款成功但付款记录 / 订阅状态没更新」——而且因为供应商根本没投递，本地连一条日志、
 * 一个 401 都不会有，很难往配置上想。`docs/waffo.md` 与 `.agents/skills/waffo/SKILL.md`
 * 都指向这里，不要在别处另抄一份清单。
 */
export const WAFFO_WEBHOOK_EVENTS = [
  WebhookEventType.OrderCompleted,
  WebhookEventType.SubscriptionPaymentSucceeded,
  WebhookEventType.RefundSucceeded,
  WebhookEventType.SubscriptionActivated,
  WebhookEventType.SubscriptionRenewed,
  WebhookEventType.SubscriptionRecovered,
  WebhookEventType.SubscriptionUncanceled,
  WebhookEventType.SubscriptionPlanChanged,
  WebhookEventType.SubscriptionCanceling,
  WebhookEventType.SubscriptionCanceled,
  WebhookEventType.SubscriptionPastDue,
] as const;

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
            ...(data.orderMetadata?.productId ? { productId: data.orderMetadata.productId } : {}),
            status,
            productName: data.productName,
            currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
            updatedAt: new Date(),
          },
        });
    }
    if (
      event.eventType === WebhookEventType.OrderCompleted ||
      event.eventType === WebhookEventType.SubscriptionPaymentSucceeded
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
          amount: data.chargedAmount ?? (data.amount == null ? null : String(data.amount)),
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
