# 配置、功能开关与国际化

## 本地最小配置

复制 `apps/web/env.local.example` 为 `apps/web/env.local`，设置数据库连接、认证 URL 与至少 32 字符的认证密钥，启动数据库并同步 schema 后执行 `pnpm dev`。Google、Turnstile、支付、R2 和发信均可保持关闭；邮箱密码注册与登录可以独立使用。

后台仍要求管理员邮箱白名单。未配置 Google 时，后台登录按钮显示未启用状态；本地可先在前台注册，再通过仅开发环境生效的 `ADMIN_DEV_EMAIL` 使用已有用户。Preview 与构建产物继续拒绝此免登录路径，不自动创建管理员或放宽白名单。

`pnpm env:check` 仅校验当前配置，不访问数据库、第三方 API 或业务路由。选择其他环境使用 `STARTER_ENV=prod pnpm env:check` 或 `STARTER_ENV=preview pnpm env:check`。发布脚本在操作远端前执行同一校验。

## 可选服务

| 开关              | 开启时需要的配置                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------- |
| GOOGLE_ENABLED    | GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET                                                    |
| TURNSTILE_ENABLED | TURNSTILE_SECRET、TURNSTILE_HOSTNAMES、VITE_TURNSTILE_SITE_KEY                            |
| PAYMENTS_ENABLED  | WAFFO_MERCHANT_ID、WAFFO_PRIVATE_KEY、WAFFO_STORE_ID、WAFFO_SUCCESS_URL、WAFFO_PRODUCTS   |
| STORAGE_ENABLED   | R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_PUBLIC_BASE_URL |
| EMAIL_ENABLED     | CLOUDFLARE_EMAIL_ACCOUNT_ID、CLOUDFLARE_EMAIL_API_TOKEN、EMAIL_FROM_ADDRESS               |

- `false` 明确关闭；即使远端保留旧密钥，也不初始化该服务。
- `true` 明确开启；配置缺失、格式错误或支付商品数组无效立即报错。
- 未填写开关时按已有配置自动判断，兼容旧项目：只填部分服务配置会触发完整性校验。

开关通过服务端 oRPC 返回公开能力状态，浏览器不根据重复的开关副本决定功能。服务端仍独立校验：关闭支付时结账拒绝、Webhook 返回 503，关闭存储时上传拒绝。前台隐藏关闭服务对应的 Google 登录、密码找回与支付区域，后台隐藏未启用的图片上传；基础页面不需要这些服务的凭证。

生产和 Preview 示例默认要求开启 Turnstile，发布前填写完整配置；若明确选择不启用，显式设置 false。生产不跳过环境校验。可选运行时变量通过发布白名单上传；服务开关也在白名单中。配置变更后更新 GitHub production Secret 再发布。

## 国际化与 SEO

- `apps/web/project.inlang/settings.json` 定义支持的语言与默认语言，`apps/web/messages/en.json` 是消息 key 与插值参数基准。
- 修改消息时同步所有已支持语言，然后运行 `pnpm messages` 生成声明。生成目录不手改。`pnpm check:i18n` 检查语言文件、key 和命名插值的一致性，已接入 `pnpm check`、pre-commit 与 CI。
- 页面 Link 使用现有 Router rewrite；原生链接和手动跳转使用 Paraglide `localizeHref`。语言切换保留当前路径、查询参数与锚点。博客没有对应翻译时，该语言切换项不可用。
- `apps/web/src/utils/seo.ts` 统一 canonical、hreflang、Open Graph 和 Twitter 元信息。站点地址在构建时从 BETTER_AUTH_URL 派生；网站地址与认证地址不同才设置公开的 VITE_SITE_URL。
- 首页与博客列表提供所有支持语言的 sitemap 记录。博客文章只为实际发布的语言生成记录与 reciprocal hreflang；相同 slug 表示同一篇文章的语言版本。
- 登录、应用、付款结果和密码重置页面默认 noindex，公开内容页才允许索引。Preview 全站 noindex，robots 拒绝抓取且不提供 sitemap。robots 不屏蔽需要爬虫读取 noindex 的账户页面。
- 新增公开页面时同时维护页面 SEO 与 sitemap，不把“所有路由都允许索引”作为默认行为。

参考：[Paraglide 路由](https://paraglidejs.com/i18n-routing)、[Google 多语言页面](https://developers.google.com/search/docs/specialty/international/localized-versions)。
