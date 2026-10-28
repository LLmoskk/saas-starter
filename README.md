# AI 视频多站模板

用于在一个新仓库中围绕多个人工挑选的关键词快速建立独立 AI 视频站。每站有自己的代码、Cloudflare Worker、D1、R2、域名、用户、积分和 Waffo 商户。`sites/demo` 是通用图片生成视频示例；站点可以按关键词修改品牌、文案、模型与价格。`packages/*` 复用认证、支付、数据库、生成与 UI；`apps/admin` 是独立登录的总后台，可切换站点查看用户、订单、内容与生成任务。

## 结构

```text
sites/demo/       通用 Demo 站点；新站复制到 sites/<站点>
apps/admin/       总后台，独立 D1 和管理员登录
packages/api/     站点 oRPC 接口
packages/auth/    Better Auth、Waffo 支付与积分入账
packages/db/      D1 schema 和迁移
packages/jobs/    yir 生成步骤与 Cloudflare Workflow
packages/ui/      共用界面组件
```

## 本地开发

需要 Node.js 24、pnpm 11.26.0。复制 `sites/demo/env.local.example` 到 `sites/demo/env.local`，复制 `apps/admin/env.local.example` 到 `apps/admin/env.local`，分别配置认证密钥。运行：

```sh
pnpm install
pnpm --filter site-demo db:migrate:local
pnpm --filter admin db:migrate:local
pnpm dev
```

Demo 在 `http://localhost:3001`，后台在 `http://localhost:3002`。后台需配置管理员邮箱及站点 token 才能访问站点数据。默认关闭 Google、Turnstile、支付、发信和博客直传。Demo 的 yir 模型、密钥及 USD 上限由建站时配置；缺少时不开放生成。本站上传的参考图与生成结果使用 Worker 的 R2 `MEDIA` 绑定。

## 创建新站

复制 `sites/demo` 并为关键词定制页面与流程；AI 应先核对 yir 模型输入输出，再设置站点模型、单次成本上限与积分价格。每站使用独立 D1、R2、Worker、Workflow 和 Waffo 商户。在 `apps/admin/src/sites.ts` 添加站点，再配置后台的对应 URL 与 token。完整步骤见 [部署说明](docs/cloudflare.md) 和 [配置说明](docs/configuration.md)。不提供建站 CLI；新站直接由 AI 按仓库约定实现。

本分支只提供模板代码。真实 Cloudflare 资源、域名、商户和 yir 凭证需在使用模板的新仓库中填写。`pnpm check`、`pnpm check-types`、`pnpm build` 可进行静态检查；生产发布由新仓库的 `main` 推送触发，数据库迁移需要单独执行。支付配置与 Webhook 事件见 [Waffo 说明](docs/waffo.md)。
