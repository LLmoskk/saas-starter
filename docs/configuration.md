# 站点配置

每个站点的 `env.local` 与 `env.prod` 位于自己的 `sites/<站点>`，总后台的环境文件位于 `apps/admin`。示例见相邻的 `env.*.example`。`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL` 仅站点需要；后台独立使用 `ADMIN_BETTER_AUTH_SECRET`、`ADMIN_BETTER_AUTH_URL`、`ADMIN_EMAILS`。站点和后台各有自己的 D1 用户库，后台通过 `ADMIN_SITE_URLS`、`ADMIN_SITE_TOKENS` 和站点受保护接口切换查看各站数据。

| 开关                | 开启时需要                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `GOOGLE_ENABLED`    | `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`                                                               |
| `TURNSTILE_ENABLED` | `TURNSTILE_SECRET`、`TURNSTILE_HOSTNAMES`、`VITE_TURNSTILE_SITE_KEY`                                     |
| `PAYMENTS_ENABLED`  | 该站的 `WAFFO_MERCHANT_ID`、`WAFFO_PRIVATE_KEY`、`WAFFO_STORE_ID`、`WAFFO_SUCCESS_URL`、`WAFFO_PRODUCTS` |
| `STORAGE_ENABLED`   | 博客直传所用的 R2 S3 凭证与公开地址；生成任务直接使用站点 `MEDIA` 绑定                                   |
| `EMAIL_ENABLED`     | Cloudflare 发信凭证和发件地址                                                                            |

关闭的服务设置为 `false`。`WAFFO_PRODUCTS` 是 JSON 数组；需要充值的商品设置正整数 `credits`。每站单独配置价格和权益。`YIR_API_KEY`、`YIR_VIDEO_MODEL`、`YIR_VIDEO_MAX_COST` 决定 Demo 生成流程；缺少模型或单次 USD 上限时不显示可用流程。模型必须先确认支持 `first_frame` 文件输入。`SITE_ADMIN_TOKEN` 必须与后台 JSON 映射中同站点 token 一致。

站点翻译位于 `sites/<站点>/messages`，SEO 由该站 `src/utils/seo.ts` 和路由控制。改动消息后运行 `pnpm messages` 与 `pnpm check:i18n`。`VITE_SITE_URL` 在构建时确定公开站点 canonical；新站应填写自己的 HTTPS 域名。

生产配置详见 [Cloudflare 部署](cloudflare.md)，支付事件及退款见 [Waffo](waffo.md)。
