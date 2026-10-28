# Cloudflare 部署

本模板在 `sites/<站点>` 放独立网站，在 `apps/admin` 放总后台。每站有独立 Worker、D1、R2、域名、认证密钥、Waffo 商户和 yir 配置。`packages/*` 只放共享业务代码。`cloudflare.config.ts` 控制 Worker 构建与绑定；`wrangler.jsonc` 用于 D1 迁移，两个文件中的数据库名和 ID 必须一致。当前 Demo 的资源名是示例，复制到新仓库后按项目命名。

## 新建站点

1. 复制 `sites/demo` 到 `sites/<关键词>`，修改包名、页面、翻译、SEO、`cloudflare.config.ts` 的 Worker、D1、R2、Workflow 名称，以及 `wrangler.jsonc` 的同名资源。不要复制 `env.local`、`env.prod`、构建产物或 Wrangler 本地状态。为站点选择 yir 支持单图首帧输入的模型并设置 `YIR_VIDEO_MODEL`、`YIR_VIDEO_MAX_COST`；按报价设定商品积分和流程积分成本。
2. 在 Cloudflare 创建该站 D1 和 R2，记录 D1 UUID，在 `wrangler.jsonc` 填入真实 ID；在站点 `env.prod` 填入 `<站点名大写>_D1_ID`。为域名设置 Worker 路由并配置 DNS。后台需要自己的 D1、域名和登录凭证。
3. 在 `apps/admin/src/sites.ts` 注册站点，并在后台 `ADMIN_SITE_URLS` 与 `ADMIN_SITE_TOKENS` JSON 中配置站点 ID 对应的 URL、token；站点 `SITE_ADMIN_TOKEN` 使用相同 token。每站 token 独立。后台应由 Cloudflare Access 保护，站点管理接口仍校验 Bearer token。
4. 将各站和后台的 `env.prod.example` 复制为 `env.prod` 并填写；运行 `pnpm setup:github` 上传生产配置。新增站点后重新运行。未提交的环境文件不得进入 Git。
5. 先执行站点和后台的 D1 迁移，再推送 `main`。schema 不在 CI 中自动同步。迁移命令：在目标目录运行 `pnpm db:migrate:remote`；首次部署可先用 `pnpm db:migrate:local` 检查本地迁移。操作远端前核对 Cloudflare 账号、数据库名和 ID。

## 发布

`deploy-web.yml` 根据提交差异，仅部署变更的 `sites/*`；共享包或发布配置变更则部署所有站点。`deploy-admin.yml` 独立部署后台。两者在 `main` 推送时运行，先完成静态检查和构建，再调用 `cf deploy --prebuilt --provision=false`。脚本拒绝本机生产发布、占位 D1 ID 和非 HTTPS 认证 URL。发布不创建资源，不调用 yir，不触发支付或发信。GitHub `production` Environment 需要 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 和 `PRODUCTION_ENV_FILES`；最后一项由 `pnpm setup:github` 从各目录的私有 `env.prod` 汇总。生产密钥变更后重新运行配置脚本。

本地仅做构建和预演：`pnpm --filter site-demo build`、`pnpm --filter admin build`，或在目标目录执行 `pnpm deploy:dry-run`。本模板默认不提供每站 Preview。`cf` 构建产物在 `.cloudflare/output/v0/`。`wrangler d1 migrations apply DB --local` 只修改本地 D1。

## 资源与费用

实际 yir 提交发生在用户创建生成任务后；流程先询价，并要求报价不超过站点设置的每步 `maxCost`。Cloudflare Workflow 保留任务状态，D1 保存任务和积分流水，R2 保存参考图与结果。失败或取消时返还任务积分；已提交到 yir 的任务可能产生上游费用。每个站点应自行设置 yir 账号预算、模型价格上限、R2 生命周期和 Workflow 并发上限，完成真实付费验收后再开放流量。原图建议短期清理，结果按产品权益设置保留期；未配置生命周期时对象会一直存储并计费。

参考：[Cloudflare cf 配置](https://developers.cloudflare.com/cf/projects/cloudflare-config/)、[D1 迁移](https://developers.cloudflare.com/d1/reference/migrations/)、[Workflows](https://developers.cloudflare.com/workflows/)。
