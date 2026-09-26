---
name: waffo-pancake
description: "Step-by-step guide for integrating @waffo/pancake-ts into any TypeScript/Node.js project — covers store setup, products, checkout, webhooks, subscriptions, and GraphQL queries. Use when implementing payment processing, checkout flows, subscriptions, webhooks, product management, or any Waffo Pancake API integration."
user-invokable: true
args: "[scenario]"
---

# Waffo Pancake SDK Integration

You are integrating the `@waffo/pancake-ts` payment SDK into a TypeScript project. Follow these steps exactly. The SDK uses Merchant API Key authentication — all requests are signed automatically.

**Trigger when:** code imports `@waffo/pancake-ts`, user asks about Waffo Pancake payments, checkout integration, webhook verification, or product/order management.

**Do NOT trigger when:** general payment concepts, other payment SDKs (Stripe, PayPal), or frontend-only UI work unrelated to payment logic.

---

## When to Use This SDK

Waffo Pancake is a merchant-of-record payment platform. Use it when your project needs:

- **SaaS subscription billing** — monthly/yearly plans with upgrade/downgrade, cancellation, and renewal handling
- **Digital product sales** — one-time purchases for e-books, templates, courses, software licenses
- **Per-usage or per-download payments** — charge users per action like downloading a file or API call credits
- **Hybrid models** — combine subscriptions with one-time purchases

### Example Use Cases

| Project Type | Payment Model | Products to Create |
|---|---|---|
| AI Skills marketplace | Per-download + Pro subscription | 1 one-time product ($0.99/download) + 2 subscription products (monthly/yearly) |
| Online course platform | One-time purchase per course | 1 one-time product per course ($29–$199) |
| SaaS tool (Starter/Pro/Enterprise) | Subscription tiers | 3 subscription products with a product group for plan switching |
| Design template shop | One-time per template | 1 one-time product per template |
| API service with usage credits | Credit packs + subscription | 1 one-time product per credit pack + subscription for monthly quota |
| Newsletter / community | Membership subscription | 1 monthly + 1 yearly subscription product |

---

## Installation

```bash
npm install @waffo/pancake-ts
```

Zero dependencies. Works in Node.js 18+. Server-side only — never expose the private key to the browser.

---

## Getting Started

You only need **two values** to start:

```bash
WAFFO_MERCHANT_ID=<your-merchant-id>
WAFFO_PRIVATE_KEY=<your-rsa-private-key>
```

Both live on Dashboard → API & Development (API 与开发), inside the "Create an API Key" section.

`WAFFO_MERCHANT_ID` means your **Merchant ID**, not `storeId` and not a store identifier from a URL. `storeId` is still part of the current API model for store and product management flows, so do not confuse the two.

For the first working integration, only these two env vars need to exist: `WAFFO_MERCHANT_ID` and `WAFFO_PRIVATE_KEY`. Store IDs and Product IDs are runtime values you can keep in code, app config, or your own database.

### Store Selection Rule

When creating products, first determine whether the merchant already has one or more stores:

- If the merchant has no store yet, create a store first.
- If the merchant has exactly one store, use that store automatically.
- If the merchant has multiple stores, ask which store the product should be created in before calling any product creation API.

Do not guess the target store when multiple stores exist.

### Path A: Create Everything via SDK (Starting Fresh)

```typescript
import { WaffoPancake } from "@waffo/pancake-ts";

const client = new WaffoPancake({
  merchantId: process.env.WAFFO_MERCHANT_ID!,
  privateKey: process.env.WAFFO_PRIVATE_KEY!,
});

// 1. Create a store
const { store } = await client.stores.create({ name: "My SaaS" });
console.log("Store ID:", store.id); // Save this

// 2. Create products
const { product: monthly } = await client.subscriptionProducts.create({
  storeId: store.id,
  name: "Pro Monthly",
  billingPeriod: "monthly",
  prices: { USD: { amount: "9.99", taxIncluded: true, taxCategory: "saas" } },
});

const { product: yearly } = await client.subscriptionProducts.create({
  storeId: store.id,
  name: "Pro Yearly",
  billingPeriod: "yearly",
  prices: { USD: { amount: "99.00", taxIncluded: true, taxCategory: "saas" } },
});

console.log("Monthly Product ID:", monthly.id); // Save this
console.log("Yearly Product ID:", yearly.id);   // Save this

// 3. Create a checkout session
const session = await client.checkout.createSession({
  productId: monthly.id,
  productType: "subscription",
  currency: "USD",
});
// Redirect customer to session.checkoutUrl
```

### Path B: Use Existing Products from Dashboard

If you've already created products in the Dashboard, copy the Product ID and go straight to checkout. In this flow, you still only need the same two env vars above:

```typescript
const client = new WaffoPancake({
  merchantId: process.env.WAFFO_MERCHANT_ID!,
  privateKey: process.env.WAFFO_PRIVATE_KEY!,
});

const session = await client.checkout.createSession({
  productId: "PROD_xxx_from_dashboard",
  productType: "subscription",
  currency: "USD",
  buyerEmail: "customer@example.com",
  successUrl: "https://myapp.com/welcome",
});
// Redirect customer to session.checkoutUrl
```

---

## PEM Key Handling

The private key is RSA PEM format. Multiple approaches for environment variables:

**Option A: Escaped newlines**
```
WAFFO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----"
```

**Option B: Base64 encode the entire PEM (recommended for CI/CD)**
```bash
# Encode
cat private.pem | base64 | tr -d '\n'
# Set env var
WAFFO_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...
```
```typescript
const privateKey = Buffer.from(process.env.WAFFO_PRIVATE_KEY_BASE64!, "base64").toString("utf-8");
const client = new WaffoPancake({ merchantId, privateKey });
```

**Option C: File path (local development)**
```typescript
import { readFileSync } from "fs";
const privateKey = readFileSync("./keys/private.pem", "utf-8");
const client = new WaffoPancake({ merchantId, privateKey });
```

The SDK auto-normalizes all formats (PEM headers, raw base64, literal `\n`, Windows line endings). The constructor throws immediately if the key is invalid.

---

## Available Resources

| Namespace | Methods | Description |
|-----------|---------|-------------|
| `client.auth` | `issueSessionToken()` | Issue buyer session token for checkout |
| `client.stores` | `create()` `update()` `delete()` | Store management (webhook, notification, checkout settings) |
| `client.onetimeProducts` | `create()` `update()` `publish()` `updateStatus()` | One-time product CRUD with multi-currency pricing |
| `client.subscriptionProducts` | `create()` `update()` `publish()` `updateStatus()` | Subscription product CRUD with billing period |
| `client.subscriptionProductGroups` | `create()` `update()` `delete()` `publish()` | Product groups for shared trial and plan switching |
| `client.orders` | `cancelSubscription()` | Cancel subscription (pending→canceled, active→canceling) |
| `client.checkout` | `createSession()` | Create checkout session, returns `checkoutUrl` |
| `client.graphql` | `query<T>()` | Typed GraphQL queries (read-only) |
| `client.webhooks` | `verify<T>()` | Webhook signature verification |

---

## Full API Reference

### Stores

```typescript
// Create
const { store } = await client.stores.create({ name: "My Store" });

// Update (partial — only provided fields change)
const { store } = await client.stores.update({
  id: "store_id",
  name: "New Name",
  supportEmail: "help@example.com",
  website: "https://example.com",
});

// Soft-delete
const { store } = await client.stores.delete({ id: "store_id" });
```

### One-Time Products

Prices use the **display amount** for the selected currency. For USD, pass `"29.00"` instead of cents.

```typescript
// Create
const { product } = await client.onetimeProducts.create({
  storeId: "store_id",
  name: "E-Book",
  description: "A great e-book",
  prices: {
    USD: { amount: "29.00", taxIncluded: false, taxCategory: "digital_goods" },
  },
  successUrl: "https://example.com/thanks",
  metadata: { sku: "EB-001" },
});

// Update (creates new version; no-op if unchanged)
const { product } = await client.onetimeProducts.update({
  id: "product_id",
  name: "E-Book v2",
  prices: { USD: { amount: "39.00", taxIncluded: false, taxCategory: "digital_goods" } },
});

// Publish test version to production (one-way)
const { product } = await client.onetimeProducts.publish({ id: "product_id" });

// Activate / deactivate
const { product } = await client.onetimeProducts.updateStatus({
  id: "product_id",
  status: "inactive", // or "active"
});
```

**taxCategory options:** `digital_goods` | `saas` | `software` | `ebook` | `online_course` | `consulting` | `professional_service`

### Subscription Products

```typescript
// Create
const { product } = await client.subscriptionProducts.create({
  storeId: "store_id",
  name: "Pro Monthly",
  billingPeriod: "monthly", // "weekly" | "monthly" | "quarterly" | "yearly"
  prices: {
    USD: { amount: "9.99", taxIncluded: true, taxCategory: "saas" },
  },
  metadata: { trialDays: 14 }, // optional trial
});

// Update, publish, updateStatus — same pattern as one-time products
```

### Subscription Product Groups

Groups enable shared trials and plan switching between subscription products.

```typescript
// Create group
const { group } = await client.subscriptionProductGroups.create({
  storeId: "store_id",
  name: "Pro Plans",
  rules: { sharedTrial: true },
  productIds: ["monthly_product_id", "yearly_product_id"],
});

// Update (productIds is a full replacement)
await client.subscriptionProductGroups.update({
  id: "group_id",
  productIds: ["monthly_id", "quarterly_id", "yearly_id"],
});

// Publish to production (supports repeated UPSERT)
await client.subscriptionProductGroups.publish({ id: "group_id" });

// Delete (physical delete, not soft)
await client.subscriptionProductGroups.delete({ id: "group_id" });
```

### Checkout Sessions

Creates a payment page. Redirect the customer to `checkoutUrl`.

```typescript
const session = await client.checkout.createSession({
  productId: "product_id",
  productType: "onetime",     // "onetime" | "subscription"
  currency: "USD",
  buyerEmail: "buyer@example.com",           // optional, pre-fills email
  successUrl: "https://example.com/thanks",  // redirect after payment
  metadata: { orderId: "internal-123" },     // custom key-value pairs
  // Optional overrides:
  priceSnapshot: { amount: 19.99, taxIncluded: true, taxCategory: "saas" }, // dynamic pricing
  billingDetail: { country: "US", isBusiness: false },
  expiresInSeconds: 3600,     // default: 2700 (45 minutes)
  withTrial: true,            // for subscriptions with trial
  darkMode: true,             // true=dark / false=light / omit=store default
});

// session.checkoutUrl  — redirect customer here
// session.sessionId    — for tracking
// session.expiresAt    — ISO 8601 expiry
```

**Parameter priority:**

| Parameter | Purpose | Notes |
|-----------|---------|-------|
| `priceSnapshot` | Override product price (dynamic pricing) | Highest priority — ignores product's set price |
| `currency` | Specify checkout currency | Required |
| `buyerEmail` | Pre-fill consumer email | Optional |
| `billingDetail` | Pre-fill billing info | Optional |
| `successUrl` | Redirect after payment | Overrides product-level successUrl |
| `metadata` | Custom key-value pairs | Passed through to webhook `event.data` |
| `withTrial` | Enable trial period | Overrides product-level trial settings |
| `expiresInSeconds` | Session expiration | Default 2700 (45 min), max 7 days |
| `darkMode` | Checkout dark mode | `true`=dark / `false`=light / omit=store default |

### Cancel Subscription

```typescript
const { orderId, status } = await client.orders.cancelSubscription({
  orderId: "order_id",
});
// status: "canceled" (was pending) or "canceling" (was active, ends at period end)
```

### GraphQL Queries

Read-only queries. Return type is `{ data: T | null, errors?: [...] }` — access via `result.data`.

```typescript
const result = await client.graphql.query<{
  stores: Array<{ id: string; name: string; status: string }>;
}>({
  query: `query { stores { id name status } }`,
});
const stores = result.data?.stores ?? [];

// With variables
const result = await client.graphql.query<{
  onetimeProduct: { id: string; name: string; prices: unknown };
}>({
  query: `query ($id: String!) { onetimeProduct(id: $id) { id name prices } }`,
  variables: { id: "product_id" },
});
```

---

## Webhook Verification

Webhooks use RSA-SHA256 signatures. The SDK embeds public keys for both test and prod environments.

**Critical:** Read the request body as **raw text**, not parsed JSON. Parsing first breaks signature verification.

### Next.js App Router

```typescript
import { verifyWebhook, WebhookEventType } from "@waffo/pancake-ts";

export async function POST(request: Request) {
  const body = await request.text(); // MUST be raw text
  const sig = request.headers.get("x-waffo-signature")!;
  try {
    const event = verifyWebhook(body, sig);

    // Idempotent dedup — use event.id (delivery ID)
    if (await isDuplicate(event.id)) return new Response("OK");
    await markProcessed(event.id);

    switch (event.eventType) {
      case WebhookEventType.OrderCompleted:
        // fulfill order
        break;
      case WebhookEventType.SubscriptionActivated:
        // activate access
        break;
      case WebhookEventType.SubscriptionCanceled:
        // revoke access at period end
        break;
    }

    return new Response("OK");
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
}
```

### Express

```typescript
import express from "express";
import { verifyWebhook } from "@waffo/pancake-ts";

app.post("/webhooks", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = verifyWebhook(
      req.body.toString("utf-8"),
      req.headers["x-waffo-signature"] as string,
    );
    res.status(200).send("OK");
    // handle event async...
  } catch {
    res.status(401).send("Invalid signature");
  }
});
```

### Hono

```typescript
import { verifyWebhook } from "@waffo/pancake-ts";

app.post("/webhooks", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("x-waffo-signature");
  try {
    const event = verifyWebhook(body, sig);
    return c.text("OK");
  } catch {
    return c.text("Invalid signature", 401);
  }
});
```

### Verification Options

```typescript
// Specify environment explicitly
verifyWebhook(body, sig, { environment: "prod" });

// Disable replay protection (not recommended for production)
verifyWebhook(body, sig, { toleranceMs: 0 });

// Custom tolerance (default: 5 minutes)
verifyWebhook(body, sig, { toleranceMs: 600000 });
```

### Webhook Event Types

| Event | Trigger |
|-------|---------|
| `order.completed` | One-time payment succeeded |
| `subscription.activated` | First subscription payment succeeded |
| `subscription.payment_succeeded` | Renewal payment succeeded |
| `subscription.canceling` | Buyer initiated cancel (active until period end) |
| `subscription.uncanceled` | Buyer withdrew cancellation |
| `subscription.plan_changed` | Plan changed (upgrade/downgrade) |
| `subscription.canceled` | Subscription fully terminated |
| `subscription.past_due` | Renewal payment failed |
| `refund.succeeded` | Refund completed |
| `refund.failed` | Refund failed |

### Webhook Event Shape

```typescript
interface WebhookEvent {
  id: string;           // Delivery ID (use for idempotent dedup)
  timestamp: string;    // ISO 8601 UTC
  eventType: string;
  eventId: string;      // Business event ID (payment/order ID)
  storeId: string;
  mode: "test" | "prod";
  data: {
    orderId: string;
    buyerEmail: string;
    currency: string;
    amount: number;     // display amount (for example 9.99 USD)
    taxAmount: number;
    productName: string;
  };
}
```

### Configuring Webhook URLs via SDK

A store can have multiple webhooks, each delivering to a different channel (`http`, `feishu`, `discord`, `telegram`, `slack`). Register one entry per channel and environment:

```typescript
// HTTP — Test environment
await client.webhooks.add({
  storeId: "store_id",
  channel: "http",
  url: "https://your-domain.com/api/webhooks",
  events: ["order.completed", "subscription.activated", "subscription.canceled"],
  testMode: true,
});

// HTTP — Production environment
await client.webhooks.add({
  storeId: "store_id",
  channel: "http",
  url: "https://your-domain.com/api/webhooks",
  events: ["order.completed", "subscription.activated", "subscription.canceled"],
  testMode: false,
});

// Update / remove
await client.webhooks.update({ id: "WBH_xxx", events: ["order.completed"] });
await client.webhooks.remove({ id: "WBH_xxx" });
```

To list webhooks, use the GraphQL `Store.storeWebhooks` field — it is the only query entry point.

---

## Common Gotchas

| Gotcha | Why it breaks | Fix |
|--------|---------------|-----|
| Reading webhook body as JSON | `request.json()` re-serializes; signature fails | Use `request.text()` (App Router/Hono) or `express.raw()` (Express) |
| Using localtunnel for webhooks | Strips custom HTTP headers; `X-Waffo-Signature` never arrives | Use `ngrok http 3000` |
| Forgetting `.publish()` | Products created in test env by default; prod checkout sessions fail silently | Call `.publish()` before going live |
| Accessing `result` instead of `result.data` in GraphQL | GraphQL returns `{ data: T, errors?: [...] }` | Destructure: `const stores = result.data?.stores ?? []` |
| Using `$id: ID!` in GraphQL variables | Backend uses `String!` not `ID!`; wrong type silently returns null | Always declare ID variables as `$id: String!` |
| `productIds` in group update is full replacement | Replaces entire list, does not append | Pass complete desired list every time |

---

## Error Handling

```typescript
import { WaffoPancakeError } from "@waffo/pancake-ts";

try {
  await client.stores.create({ name: "" });
} catch (err) {
  if (err instanceof WaffoPancakeError) {
    console.log(err.status);           // HTTP status code
    console.log(err.errors);           // [{ message, layer }]
    console.log(err.errors[0].layer);  // "store" | "product" | "order" | ...
  }
}
```

Errors ordered by call stack depth: `errors[0]` = deepest layer (root cause), `errors[n]` = outermost.

| Status | Cause | Fix |
|--------|-------|-----|
| 400 | Invalid request body | Check required fields and types |
| 401 | Bad signature or expired token | Verify API key and private key match |
| 403 | `prodEnabled=false` | Complete KYB review in dashboard |
| 403 | Product not found or not accessible | Check the product belongs to the current merchant and environment |
| 409 | Idempotency conflict or duplicate nickname | Wait and retry, or use unique nickname |
| 429 | Rate limited | Back off and retry |

---

## Critical Rules

### ALWAYS DO

- **Raw body for webhooks**: `express.raw()` or `request.text()`. Parsed JSON breaks signatures.
- **New tab for checkout**: `window.open(url, "_blank", "noopener,noreferrer")`. Preserves merchant page state.
- **Built-in verification**: `verifyWebhook()` has embedded public keys for test and prod.
- **Use display amounts**: pass `"29.00"` for USD instead of cents-based integers.
- **Env vars for secrets**: `WAFFO_MERCHANT_ID` and `WAFFO_PRIVATE_KEY` in `.env`.
- **Separate API keys**: Different keys for test and production environments.
- **Respond 200 immediately**: In webhook handlers, respond before async processing.
- **Use `ngrok` for local tunneling**: It preserves custom HTTP headers. localtunnel strips them.

### NEVER DO

- **Never** use `express.json()` on webhook routes.
- **Never** use `window.location.href` for checkout redirect.
- **Never** implement RSA-SHA256 signing manually — the SDK handles it.
- **Never** hardcode private keys in source code.
- **Never** use the same API key for test and production.
- **Never** mix cents-based integers with display amounts in the same integration.

---

## Data Conventions

| Type | Format | Example |
|------|--------|---------|
| Amounts | Display amount string | `"29.00"` for USD |
| Currency | ISO 4217 | `USD`, `EUR`, `JPY` |
| Timestamps | ISO 8601 UTC | `2026-01-23T00:00:00.000Z` |
| IDs | `{PREFIX}_{base62}` | `STO_xxx`, `PROD_xxx`, `ORD_xxx` |
| Checkout Session ID | `cs_` + UUID | `cs_550e8400-...` |

---

## Dashboard UI Glossary (EN → ZH → JA)

The Dashboard supports English, Chinese, and Japanese. When referencing a Dashboard location, use this mapping.

| English | 中文 | 日本語 |
|---------|------|--------|
| Home | 首页 | ホーム |
| Products | 产品 | 商品 |
| Customers | 客户 | 顧客 |
| Analytics | 分析 | 分析 |
| Payments | 付款 | 支払い |
| Subscriptions | 订阅 | サブスクリプション |
| Revenue | 收入 | 収益 |
| API & Development | API 与开发 | API と開発 |
| Settings | 设置 | 設定 |
| Merchant ID | 商户 ID | マーチャントID |
| Store ID | 店铺 ID | ストアID |
| API Key | API 密钥 | APIキー |
| Private Key | 私钥 | 秘密鍵 |
| Test Mode | 测试模式 | テストモード |
| Live Mode | 生产模式 | 本番モード |
| One-time | 一次性 | 単発 |
| Subscription | 订阅 | サブスクリプション |
| Active | 生效中 | 有効 |
| Canceled | 已取消 | キャンセル済み |
| Completed | 已完成 | 完了 |

**Where to find IDs:**
- `WAFFO_MERCHANT_ID` → Dashboard → API & Development (API 与开发) → the "Create an API Key" section → first row above the key list, with a copy button. It is **not** at the top of the page and the section heading does not mention it
- `Store ID` → Dashboard → Settings (设置) → Store Profile (店铺资料)
- `Product ID` → Dashboard → Products (产品) → click product → shown in URL and detail page
- `API Key` → Dashboard → API & Development (API 与开发) → "Create an API Key" section → Create Key

---

## Test Cards

### Successful Payments

| Card | Type |
|------|------|
| `4576 7500 0000 0110` | Visa Credit |
| `2226 9000 0000 0110` | Mastercard Credit |
| `4001 7000 0000 0110` | Visa Debit |
| `2226 9300 0000 0110` | Mastercard Debit |

### Declined Payments

| Card | Type |
|------|------|
| `4576 7500 0000 0220` | Visa Credit |
| `2226 9000 0000 0220` | Mastercard Credit |
| `4001 7000 0000 0220` | Visa Debit |
| `2226 9300 0000 0220` | Mastercard Debit |

Any future expiry. Any CVC.

---

## Local Development Tips

1. **Use `ngrok` for webhook tunneling** — preserves all custom HTTP headers including `X-Waffo-Signature`. localtunnel strips custom headers. ngrok preserves them.

```bash
# Install: brew install ngrok/ngrok/ngrok  (or https://ngrok.com/download)
ngrok http 3000
```

2. **Idempotency** — SDK auto-generates deterministic idempotency keys from `merchantId + path + body`. Identical requests produce identical keys, so retries are safe.

3. **Test vs Prod** — Products created in test environment by default. Use `.publish()` to promote to production. Webhook events include `mode: "test" | "prod"`.

---

## Product Model Decision Table

| Situation | Model |
|-----------|-------|
| Fixed public price | Product price set on the product |
| Runtime-calculated amount (overage, credits) | Checkout session with `priceSnapshot` |
| Recurring plan | Subscription product |
| Multiple subscription tiers | One subscription product per tier + product group |
| Setup fee or credits top-up | One-time product |
| Overage charge for a subscription customer | One-time product with dynamic `priceSnapshot` |

---

## Quick Start Checklist

1. `npm install @waffo/pancake-ts`
2. Set only `WAFFO_MERCHANT_ID` and `WAFFO_PRIVATE_KEY` env vars (see "Where to find IDs" above)
3. Initialize `new WaffoPancake({ merchantId, privateKey })`
4. Create store: `client.stores.create({ name })` — or use an existing store from Dashboard
5. Before creating product(s), confirm which store should own them when the merchant has multiple stores
6. Create product(s): `client.onetimeProducts.create(...)` or `client.subscriptionProducts.create(...)` — or copy existing Product IDs from Dashboard
7. Create checkout: `client.checkout.createSession(...)` → redirect to `checkoutUrl`
8. Test with card `4576750000000110` (success) or `4576750000000220` (declined) in sandbox
9. Handle webhooks: `verifyWebhook(rawBody, signatureHeader)` — use `request.text()` not `.json()`
10. Configure webhook URL: `client.webhooks.add({ storeId, channel: "http", url, events, testMode })`

---

## Documentation

- Full docs: https://docs.waffo.ai/
- AI-readable full reference: https://docs.waffo.ai/llms-full.txt
- SDK integration: https://docs.waffo.ai/integrate/sdks
- AI Skills guide: https://docs.waffo.ai/integrate/ai-integration
- npm: https://www.npmjs.com/package/@waffo/pancake-ts
- Dashboard: https://pancake.waffo.ai/merchant/dashboard/integration
