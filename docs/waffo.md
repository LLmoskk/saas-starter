# Waffo 支付与套餐变更

模板使用 `@waffo/pancake-ts` 0.26。各站独立配置 Waffo 商户与 `WAFFO_PRODUCTS`；商品包含 `id`、`name`、`type`，类型为 `onetime` 或 `subscription`。需要生成积分的商品设置正整数 `credits`。付款成功事件有 `paymentId` 时按该 ID 发放一次积分；仅确认全额退款时撤销积分，部分退款留待人工处理。生成失败或取消通过站点积分流水自动退还任务积分，若该站使用非积分收费，应在 Waffo 后台人工退款。

- 新购买调用 `checkout.authenticated.create()`；已有单一正常订阅调用 `checkout.authenticated.createPlanChange()`，原订单从当前登录用户的订阅记录获取，浏览器不能指定他人的订单。
- 变更链接包含客户令牌，无需再次通过邮箱登录。令牌放在 URL fragment 中，不要记录或缓存链接。测试环境附带 `test=true`。
- 用户在 Waffo 确认页核对金额和生效时间后才执行变更。默认由 Waffo 判断升级立即生效、降级下一周期生效；剩余不足 24 小时时显式请求下一周期，临近周期结束的限制仍由 Waffo 校验。
- 欠费、多订阅或历史非 Waffo 订单通过客户门户管理，需要付款邮箱登录。当前套餐按钮禁用；一次性商品仍可单独购买。
- 付款与变更页面通过链接在新标签页打开。创建链接结束后按钮自动恢复，关闭付款页可以继续选择其他商品。
- 每次请求携带独立幂等键。SDK 不再自动生成幂等键；需要重试时，必须保留原请求的键，不要自动重试有副作用的请求。

在新项目的 Waffo 店铺中，将 HTTP webhook 配置为 `https://<web-domain>/api/webhooks/waffo`，分别配置 test / prod 环境（`testMode` 为 `true` / `false`），并订阅 `WAFFO_WEBHOOK_EVENTS`（`packages/auth/src/payments.ts`）里的全部事件——那是配置时唯一的真相源，下面的清单只为方便阅读：

```text
order.completed
subscription.payment_succeeded
refund.succeeded
subscription.activated
subscription.renewed
subscription.recovered
subscription.uncanceled
subscription.plan_changed
subscription.canceling
subscription.canceled
subscription.past_due
```

漏订阅其中一个不会报错：供应商只是不再投递它，对应的状态变化永远到不了，服务端连一条日志都没有，往往要靠对账才发现。排期与失败事件（`subscription.plan_change_scheduled` / `plan_change_failed`）模板不订阅也不处理。

`order.completed` 和 `subscription.payment_succeeded` 写付款记录，金额优先读取实际扣款的 `chargedAmount`。订阅状态事件用于同步订阅，不把标价记作付款；新项目的业务权益应在实际生效事件中处理。Webhook 使用 SDK 验签，并在同一事务内去重和更新数据库。

商户签发的变更链接不要求开启商品组的 `selfServicePlanChange`；只有客户门户内自助切换需要同组商品和该开关。本模板未配置真实商户、商品或 webhook，需要在新项目接入自己的资源后手动验证。

## English

The template uses `@waffo/pancake-ts` 0.25. Configure products through `WAFFO_PRODUCTS` with `id`, `name`, and `type` (`onetime` or `subscription`).

New purchases use authenticated checkout. A customer with one eligible subscription receives an authenticated plan-change link for the selected product, using an order owned by the signed-in user. The link carries a customer token in its URL fragment, so no email login is needed. Never log or cache this link; test-mode links also carry `test=true`.

Waffo shows the amount and effective date before the customer confirms. It determines upgrade/downgrade timing by default; within the final 24 hours the template explicitly requests next-period timing. Past-due, multiple, and legacy orders use the customer portal instead. Checkout and plan-change links open in a new tab, and buttons unlock when the request finishes.

Configure separate test and production HTTP webhooks at `https://<web-domain>/api/webhooks/waffo`, subscribing to every event in `WAFFO_WEBHOOK_EVENTS` (`packages/auth/src/payments.ts`) — the single source of truth, repeated above only for readability. Omitting one is silent: the vendor never delivers it, the state change never arrives, and nothing shows up in your logs. Payment records are written only for successful payment events, preferring `chargedAmount`. Subscription events update subscription state; implement your product's entitlements on actual activation events. Signature verification and transactional deduplication are already wired.

Every write supplies an explicit idempotency key. Keep that key for a retry of the same logical request; do not automatically retry writes. Merchant-issued change links do not require the product group's self-service switch. Portal-initiated changes require both plans in the same group with `selfServicePlanChange` enabled.

This template has no live merchant resources or webhook configuration. Supply your own credentials and products, then manually verify purchases and plan changes before launching.
