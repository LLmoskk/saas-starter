# Cloudflare 部署

模板使用 `cf@1.0.0-beta.18` 和 `@cloudflare/vite-plugin@2.0.0-beta.v.1`，版本精确锁定。前台和后台各自使用 `cloudflare.config.ts`，PostgreSQL 通过 Hyperdrive 连接，R2 上传继续使用 S3 签名。模板不包含现有项目的账号、密钥或真实资源 ID。新工具仍为 beta。

## 需要你完成的首次配置

1. 在模板根目录运行 `pnpm deploy:setup`，自己完成浏览器中的 Cloudflare OAuth 授权。本地发布脚本使用 cf OAuth，忽略旧 shell API token；CI 使用单独的受限 token。
2. 修改 `apps/web/cloudflare.config.ts` 和 `apps/admin/cloudflare.config.ts` 中的 Worker 名称，必要时填写自己的 `accountId`。生产模式为 `production`，预览模式为 `preview`。
3. 创建生产和 Preview 两套 PostgreSQL 数据库，在 Cloudflare 创建对应 Hyperdrive，关闭查询缓存，替换全 0 / 全 1 的占位 ID。同环境前后台可共用 Hyperdrive；Preview 必须使用独立数据库。占位 ID、相同 Worker 名称或生产与 Preview 相同的 Hyperdrive ID 会阻止根目录发布脚本执行。
4. 将 `apps/web/env.prod.example` 和 `env.preview.example` 复制为各自的私有环境文件并填写。`BETTER_AUTH_URL`、`ADMIN_BETTER_AUTH_URL` 必须为自己的 HTTPS 地址，后台必须设置独立的 `ADMIN_BETTER_AUTH_SECRET`。`DATABASE_URL` 只供 schema 和 Node 脚本使用，不上传至 Worker。
5. 按官方 [配置文档](https://developers.cloudflare.com/cf/projects/cloudflare-config/) 在 `worker.triggers` 中配置自己的域名；通过 `triggers` 从 `cf/config` 导入构造器。生产和 Preview 分别配置，不能让预览模式继承生产路由。启用受保护域名后将 `workersDev` 设为 `false`；`previewUrls` 已关闭。
6. 在 Cloudflare Access 保护后台及私人 Preview 域名。需要支付测试时，只对 `/api/webhooks/waffo` 设置精确路径例外，业务端继续校验签名，不放行整个 `/api/*`。
7. 注册前后台 Google OAuth 回调 `/api/auth/callback/google`，设置 Turnstile 域名以及 R2 上传 CORS。Preview 使用独立的测试支付、存储和第三方服务配置。
8. 核对环境文件和目标后，首次发布前自行执行 `pnpm env:production` 或 `pnpm env:preview`。这会真实写入远端密钥。正式发布也由你执行，本轮迁移没有修改远端。

## 日常命令

| 命令                                         | 行为                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                                   | Node 本地开发，使用现有 env.local 和本地数据库        |
| `pnpm --filter web dev:workers`              | Workers 本地开发，需要自己的 .dev.vars 与本地数据库   |
| `pnpm build`                                 | 构建前台和后台的默认生产 Workers 产物，不上传         |
| `pnpm --filter web deploy:dry-run`           | 本地构建与发布预演，不上传                            |
| `pnpm env:production`                        | 从 env.prod 同步白名单内的服务端密钥到两个生产 Worker |
| `pnpm env:preview`                           | 从 env.preview 同步到两个 Preview Worker              |
| `pnpm deploy:prod`                           | 使用生产变量构建并正式发布两个 Worker，随版本提交密钥 |
| `pnpm deploy:preview`                        | 使用 Preview 变量构建并正式发布两个 Preview Worker    |
| `pnpm db:push:prod` / `pnpm db:push:preview` | 手动同步目标数据库 schema                             |

后台支持对应的 `dev:workers` 和 `deploy:dry-run`。根目录部署脚本调用 `vite build --mode production/preview`，再调用 `cf deploy --prebuilt --mode ... --secrets-file ... --provision=false`，避免自动创建缺失资源。cf beta 在当前 monorepo 中拒绝转发 `cf build --mode ...`，因此指定环境使用 Vite 的模式参数。

`VITE_*` 在构建时进入浏览器；`SENTRY_AUTH_TOKEN` 仅用于构建上传。`packages/env/src/worker-env.ts` 的 `WORKER_REQUIRED_SECRET_NAMES` 只包含共享的启动必需项，各应用另外声明自己的认证必需项，供 cf 配置声明；`WORKER_RUNTIME_SECRET_NAMES` 是同步和发布所用的完整白名单，包含可选项。未配置 Sentry 时不要求 `SENTRY_DSN`，填写后仍会随同步或发布上传。未提供的密钥由平台保留。新增变量时按必需性维护对应列表。同步和部署只处理白名单内的非空值，临时密钥文件使用 0600 权限并在退出时删除。环境文件与 `.cloudflare/`、`.dev.vars*` 均被 Git 忽略。

构建和部署不执行 schema 同步。数据库变更先核对目标，再运行对应 `db:push`。两个 Worker 分别发布，第二个失败不会自动回滚第一个。

## Preview 的本地构建与预演

```sh
cd apps/web
CLOUDFLARE_BUILD=1 pnpm exec vite build --mode preview
pnpm exec cf deploy --prebuilt --dry-run --mode preview --provision=false
```

后台同理。`--prebuilt` 必须使用刚刚为同一模式构建的产物。预演不会验证占位资源是否存在，正式发布请使用根目录带保护检查的 `deploy:prod` / `deploy:preview`。

## Git 和 CI

模板保留手动 CLI 发布，Git push 不会自动部署。若自己接入 Workers Builds，为两个应用分别设置构建根目录、分支和变量：

- 生产：应用根目录 `apps/web` 或 `apps/admin`，`STARTER_ENV=prod`，构建命令 `pnpm build`，部署命令 `pnpm exec cf deploy --prebuilt --mode production --provision=false`。
- Preview：选择 Preview 分支，`STARTER_ENV=preview`，构建命令 `CLOUDFLARE_BUILD=1 pnpm exec vite build --mode preview`，部署命令 `pnpm exec cf deploy --prebuilt --mode preview --provision=false`。

构建期变量在 CI 设置；运行时密钥先通过本地同步命令配置。不要把根目录同时发布两个应用的脚本填到单 Worker 的 Builds 命令中。不要将本机 OAuth 会话复制进 CI。

## 迁移验证与过渡文件

前后台的 production 和 preview 构建、预构建发布预演以及绑定类型生成后的类型检查已通过。没有登录、上传密钥或部署，也未验证真实数据库、登录、支付、Access、R2。完成自己的账号配置后，首次部署需逐项验证这些业务流程。

旧 `wrangler.jsonc` 暂时保留，按官方迁移流程在首次 cf 正式发布成功后再移除。新配置修改以 `cloudflare.config.ts` 为准，不再同步维护旧配置。Wrangler 仍是底层构建依赖。产物在 `.cloudflare/output/v0/`，绑定类型在 `.cloudflare/types/`。

参考：[cf 配置](https://developers.cloudflare.com/cf/projects/cloudflare-config/)、[cf 构建](https://developers.cloudflare.com/cf/projects/)、[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)、[Access](https://developers.cloudflare.com/cloudflare-one/access-controls/)。官方文档已通过 Ref MCP 查询。

## 已登录却返回 403

cf 优先使用 `CLOUDFLARE_API_TOKEN`，其优先级高于登录后的 OAuth profile。旧 token 无权限时，重新登录不会改变这个优先级。根目录密钥同步和本地发布脚本会忽略这个变量，CI 继续使用 API token。

直接调用 cf 时，先在当前终端运行 `unset CLOUDFLARE_API_TOKEN`，再运行 `pnpm --dir apps/web exec cf auth whoami` 查看认证来源。不要将 token 或 OAuth 配置文件内容发到聊天中。如果 OAuth 仍然返回 403，再核对账号的目标资源权限。

参考：[官方认证优先级](https://developers.cloudflare.com/cf/get-started/index.md/#credential-order)。
