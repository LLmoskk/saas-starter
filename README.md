# SaaS Starter

自用项目模板。技术栈：pnpm、Turborepo、TanStack Start/Router、oRPC、TanStack Query、Better Auth、Drizzle/Postgres、Waffo、R2、Vercel。前台和后台分别位于 `apps/web` 与 `apps/admin`。

## 开始

1. 使用全新 Git 历史创建项目，修改包名与站点名称。
2. 复制 `apps/web/env.local.example` 为 `apps/web/env.local`，填好每一项。生产环境在 Vercel 的 web/admin 两个项目分别设置对应变量；不要复用原项目的账号、域名、密钥和桶。
3. `pnpm install`，`pnpm db:start`，`pnpm db:push`，`pnpm dev`。
4. 在 Google OAuth 中分别配置 web/admin 回调地址：`/api/auth/callback/google`。在 Turnstile 配置新域名；R2 bucket 配置允许 web/admin 来源的 PUT CORS。
5. 在 Waffo 建商品，将其 ID、名称和类型（`onetime` 或 `subscription`）加入 `WAFFO_PRODUCTS`。配置 Webhook 到 `https://<web-domain>/api/webhooks/waffo`。权益规则由新项目在确认订单/订阅状态后自行实现。
6. 将 web 和 admin 作为两个 Vercel 项目部署。生产 schema 有变化时运行 `pnpm db:push` 并确保使用生产 `DATABASE_URL`。
7. 在 Google Search Console 手动验证站点并提交 `/sitemap.xml`。

## 保留的能力

- 邮箱注册/登录、Google OAuth、找回密码、Turnstile、Resend 邮件。
- 独立后台登录、管理员白名单、用户状态、支付/订阅记录、审计日志。
- Waffo 结账和签名 Webhook，事件去重，通用订单状态；不包含业务权益。
- 中英文博客、Markdown 编辑、R2 图片上传、sitemap、robots 和基础元信息。
- Sentry、GA4、Clarity 接线，填入变量后生效。

## 新项目必做

- 更换中性首页、应用页、样式、站点名称和商品配置。
- 编写法律页面、具体支付权益与退款规则。
- 为 R2 设置公共域名与 CORS，发布前确认图片 URL 可访问。
- 在真实支付环境验证 Waffo 回调事件字段和订阅状态，再开放支付。
