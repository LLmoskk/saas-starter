# Cloudflare 部署

模板默认构建 Cloudflare Workers：前台与后台独立部署，PostgreSQL 通过 Hyperdrive 连接。R2 的签名上传保留 S3 API，浏览器直接 PUT 到 R2。模板不包含任何现有项目的账号、密钥或资源 ID。

## 新项目首次配置

1. 修改 `apps/web/wrangler.jsonc` 与 `apps/admin/wrangler.jsonc` 的 Worker 名称。
2. 运行 `pnpm --filter web exec wrangler login`，本地发布脚本使用 Wrangler OAuth，忽略 shell 中旧的 API token；CI 才需要单独配置有权限的 Cloudflare token。
3. 创建生产和 Preview 两套 PostgreSQL 数据库。在 Cloudflare 创建对应 Hyperdrive，关闭查询缓存，替换配置中的占位 ID。前台和后台可以共用同一环境的 Hyperdrive；Preview 必须连接独立数据库，不能仅创建一个指向生产库的新绑定。
4. 将 `apps/web/env.prod.example` 和 `env.preview.example` 分别复制为 `env.prod` 和 `env.preview`，填写新项目的服务账号、HTTPS 域名与密钥。后台必须使用独立的 `ADMIN_BETTER_AUTH_SECRET`。`DATABASE_URL` 仅供 schema 和 Node 脚本使用，发布命令不将它上传至 Worker。
5. 在各 Wrangler 配置加入自己的自定义域名 `routes: [{ "pattern": "example.com", "custom_domain": true }]`；Preview 的 `routes` 必须单独填写。域名和 DNS 交给 Cloudflare 管理，启用自定义域名后将 `workers_dev` 设为 `false`，防止绕过域名保护；`preview_urls` 已关闭。
6. 在 Cloudflare Access 保护后台，以及需要私人测试的 Preview 域名，仅允许自己的邮箱。Access 全站保护会拦截供应商回调；测试支付时需对 `/api/webhooks/waffo` 配置精确路径例外，业务端继续校验签名。不要放行整个 `/api/*`。
7. 为前台和后台注册 Google OAuth 回调 `/api/auth/callback/google`。Turnstile 加入前台域名，R2 配置允许对应后台域名进行 PUT 的 CORS。Preview 使用自己的测试支付、存储和第三方服务配置。

配置文件是有效 JSON（扩展名为 JSONC），发布脚本直接读取；修改时保持有效 JSON。占位 Hyperdrive ID 或 Preview 与生产相同的绑定 ID 会阻止发布。

## 日常命令

| 命令                                         | 行为                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                                   | 保留 Node 本地开发，使用 `env.local` 和本地 PostgreSQL  |
| `pnpm build`                                 | 构建前台和后台的 Workers 产物，不上传                   |
| `pnpm env:production`                        | 从 `env.prod` 同步服务端变量到两个生产 Worker           |
| `pnpm env:preview`                           | 从 `env.preview` 同步到两个 Preview Worker              |
| `pnpm deploy:prod`                           | 使用生产变量构建、同步 secrets，然后发布两个 Worker     |
| `pnpm deploy:preview`                        | 构建时选择 `CLOUDFLARE_ENV=preview`，同步并发布 Preview |
| `pnpm db:push:prod` / `pnpm db:push:preview` | 手动将 schema 同步到目标数据库                          |

`VITE_*` 变量进入浏览器构建。`SENTRY_AUTH_TOKEN` 仅用于构建期上传 sourcemap，不能作为运行时 secret 上传。环境文件、Wrangler 本地状态和 `.dev.vars*` 已加入 Git 忽略。

构建与部署不会执行 schema 同步。数据库变更需先核对目标后运行对应的 `db:push`。两个 Worker 分别发布；第二个发布失败时，第一个已发布的版本不会自动回滚。

## Git 和构建环境

使用 `main` 作为生产分支，`preview` 作为 Preview 分支。模板保留 CLI 发布流程；新项目若需要 push 自动部署，再连接 Cloudflare Workers Builds，分别配置两个 Worker 的构建命令、分支和环境变量。Git push 本身不会执行这里的发布脚本，也不会自动同步数据库。

Cloudflare Builds 按 Worker 分别连接：应用根目录设为 `apps/web` 或 `apps/admin`，构建命令 `pnpm build`，部署命令 `pnpm exec wrangler deploy`。生产构建设置 `STARTER_ENV=prod`，不设置 `CLOUDFLARE_ENV`；Preview 设置 `STARTER_ENV=preview` 和 `CLOUDFLARE_ENV=preview`，并选择 `preview` 分支。构建期的 `VITE_*`、Sentry 变量通过 Builds 配置；运行时 secrets 在首次发布前通过本地 `env:production` / `env:preview` 同步。

根目录的 `deploy:*` 命令读取本地环境文件并发布两个应用，供本地手动上线使用；不要直接将它配置成每个 Worker 的 Builds 命令。

参考：[TanStack Start on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)、[Vite environments](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/)、[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)、[Access](https://developers.cloudflare.com/cloudflare-one/access-controls/)。
