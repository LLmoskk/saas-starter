import { db } from "@starter/db";
import { payment, subscription, webhookEvent } from "@starter/db/schema/payment";
import { user } from "@starter/db/schema/auth";
import { creditEntry } from "@starter/db/schema/generation";
import { env, services } from "@starter/env/server";
import { ChangeTiming, WaffoPancake, WebhookEventType, type WebhookEvent } from "@waffo/pancake-ts";
import type { BatchItem } from "drizzle-orm/batch";
import { and, eq, inArray } from "drizzle-orm";
import { OPEN_SUBSCRIPTION_STATUSES, WAFFO_CONSUMER_PORTAL_URL } from "./payment-contract";

export const products = services.payments?.products ?? [];
function paymentClient() {
  if (!services.payments) throw new Error("Payments are not enabled");
  return new WaffoPancake({
    merchantId: services.payments.merchantId,
    privateKey: services.payments.privateKey,
    environment: env.WAFFO_ENVIRONMENT,
  });
}
export async function createCheckout(userId: string, email: string, productId: string) {
  const waffoClient = paymentClient();
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
    successUrl: services.payments!.successUrl,
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
  const [existing] = await db
    .select({ id: webhookEvent.id })
    .from(webhookEvent)
    .where(eq(webhookEvent.id, event.id))
    .limit(1);
  if (existing) return;
  const userId = data.merchantProvidedBuyerIdentity || data.orderMetadata?.userId;
  if (!userId) throw new Error(`Webhook ${event.id} has no user identity`);
  const [buyer] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!buyer) throw new Error(`Webhook ${event.id} references unknown user`);

  const statements: BatchItem<"sqlite">[] = [
    db
      .insert(webhookEvent)
      .values({ id: event.id, eventType: event.eventType })
      .onConflictDoNothing(),
  ];
  const status = subscriptionStates[event.eventType];
  if (status) {
    statements.push(
      db
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
        }),
    );
  }
  if (
    event.eventType === WebhookEventType.OrderCompleted ||
    event.eventType === WebhookEventType.SubscriptionPaymentSucceeded
  ) {
    const id = data.paymentId?.trim() || `${event.id}:payment`;
    statements.push(
      db
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
        .onConflictDoNothing({ target: payment.paymentId }),
    );
    const purchased = products.find((product) => product.id === data.orderMetadata?.productId);
    if (purchased?.credits && data.paymentId)
      statements.push(
        db
          .insert(creditEntry)
          .values({
            id: `payment:${id}`,
            userId,
            amount: purchased.credits,
            reason: "payment",
            referenceId: id,
          })
          .onConflictDoNothing(),
      );
  }
  if (event.eventType === WebhookEventType.RefundSucceeded) {
    const fullRefund =
      data.refundedAmount != null &&
      data.originalChargedAmount != null &&
      Number(data.refundedAmount) === Number(data.originalChargedAmount);
    if (fullRefund)
      statements.push(
        db
          .update(payment)
          .set({ status: "refunded", updatedAt: new Date() })
          .where(
            data.paymentId
              ? eq(payment.paymentId, data.paymentId)
              : eq(payment.orderId, data.orderId),
          ),
      );
    const refunded = products.find((product) => product.id === data.orderMetadata?.productId);
    if (fullRefund && refunded?.credits && data.paymentId)
      statements.push(
        db
          .insert(creditEntry)
          .values({
            id: `payment-refund:${data.paymentId}`,
            userId,
            amount: -refunded.credits,
            reason: "payment_refund",
            referenceId: data.paymentId,
          })
          .onConflictDoNothing(),
      );
  }
  // D1 executes a batch atomically; the event row prevents repeated webhook effects.
  await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
