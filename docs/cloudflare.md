# Cloudflare 部署

模板使用 `cf@1.0.0-beta.18` 和 `@cloudflare/vite-plugin@2.0.0-beta.v.1`，版本精确锁定。前台和后台各自使用 `cloudflare.config.ts`，PostgreSQL 通过 Hyperdrive 连接，R2 上传继续使用 S3 签名。模板不包含现有项目的账号、密钥或真实资源 ID。新工具仍为 beta。

## 需要你完成的首次配置

1. 生产发布使用 GitHub Actions 与受限 Cloudflare API Token。本地预览需要时运行 `pnpm deploy:setup` 完成 Cloudflare OAuth 授权；不把本机 OAuth 会话复制进 CI。
2. 修改 `apps/web/cloudflare.config.ts` 和 `apps/admin/cloudflare.config.ts` 中的 Worker 名称，必要时填写自己的 `accountId`。生产模式为 `production`，预览模式为 `preview`。
3. 创建生产和 Preview 两套 PostgreSQL 数据库，在 Cloudflare 创建对应 Hyperdrive，关闭查询缓存，替换全 0 / 全 1 的占位 ID。同环境前后台可共用 Hyperdrive；Preview 必须使用独立数据库。占位 ID、相同 Worker 名称或生产与 Preview 相同的 Hyperdrive ID 会阻止根目录发布脚本执行。
4. 将 `apps/web/env.prod.example` 和 `env.preview.example` 复制为各自的私有环境文件并填写。`BETTER_AUTH_URL`、`ADMIN_BETTER_AUTH_URL` 必须为自己的 HTTPS 地址，后台必须设置独立的 `ADMIN_BETTER_AUTH_SECRET`。`DATABASE_URL` 只供 schema 和 Node 脚本使用，不上传至 Worker。
5. 按官方 [配置文档](https://developers.cloudflare.com/cf/projects/cloudflare-config/) 在 `worker.triggers` 中配置自己的域名；通过 `triggers` 从 `cf/config` 导入构造器。生产和 Preview 分别配置，不能让预览模式继承生产路由。启用受保护域名后将 `workersDev` 设为 `false`；`previewUrls` 已关闭。
6. 在 Cloudflare Access 保护后台及私人 Preview 域名。需要支付测试时，只对 `/api/webhooks/waffo` 设置精确路径例外，业务端继续校验签名，不放行整个 `/api/*`。
7. 注册前后台 Google OAuth 回调 `/api/auth/callback/google`，设置 Turnstile 域名以及 R2 上传 CORS。Preview 使用独立的测试支付、存储和第三方服务配置。
8. 按下方「GitHub Actions 首次配置」运行 `pnpm setup:github`，配置新仓库的生产变量与密钥。提交并推送 `main` 后，Workflow 自动构建并发布受影响的应用。预览仍使用 `pnpm env:preview`、`pnpm deploy:preview`。

## 日常命令

| 命令                                         | 行为                                                   |
| -------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                   | Node 本地开发，使用现有 env.local 和本地数据库         |
| `pnpm --filter web dev:workers`              | Workers 本地开发，需要自己的 .dev.vars 与本地数据库    |
| `pnpm build`                                 | 构建前台和后台的默认生产 Workers 产物，不上传          |
| `pnpm --filter web deploy:dry-run`           | 本地构建与发布预演，不上传                             |
| `pnpm setup:github`                          | 配置 GitHub production Environment、账号 ID 和生产密钥 |
| `pnpm env:production`                        | 仅 GitHub Actions 内同步生产密钥，本机执行会拒绝       |
| `pnpm env:preview`                           | 从 env.preview 同步到两个 Preview Worker               |
| `pnpm deploy:prod`                           | 仅 GitHub Actions 内使用；日常提交并推送 main 触发发布 |
| `pnpm deploy:preview`                        | 使用 Preview 变量构建并正式发布两个 Preview Worker     |
| `pnpm db:push:prod` / `pnpm db:push:preview` | 手动同步目标数据库 schema                              |

后台支持对应的 `dev:workers` 和 `deploy:dry-run`。根目录部署脚本调用 `vite build --mode production/preview`，再调用 `cf deploy --prebuilt --mode ... --secrets-file ... --provision=false`，避免自动创建缺失资源。cf beta 在当前 monorepo 中拒绝转发 `cf build --mode ...`，因此指定环境使用 Vite 的模式参数。

`VITE_*` 在构建时进入浏览器；`SENTRY_AUTH_TOKEN` 仅用于构建上传。`packages/env/src/worker-env.ts` 的 `WORKER_REQUIRED_SECRET_NAMES` 只包含共享的认证必需项，各应用另外声明自己的认证必需项，供 cf 配置声明；`WORKER_RUNTIME_SECRET_NAMES` 是同步和发布所用的完整白名单，包含可选项。未配置 Sentry 时不要求 `SENTRY_DSN`，填写后仍会随同步或发布上传。未提供的密钥由平台保留。新增变量时按必需性维护对应列表。同步和部署只处理白名单内的非空值，临时密钥文件使用 0600 权限并在退出时删除。环境文件与 `.cloudflare/`、`.dev.vars*` 均被 Git 忽略。

构建和部署不执行 schema 同步。数据库变更先核对目标，再运行对应 `db:push`。两个 Worker 分别发布，任一失败不会自动回滚另一个。

## Preview 的本地构建与预演

```sh
cd apps/web
CLOUDFLARE_BUILD=1 pnpm exec vite build --mode preview
pnpm exec cf deploy --prebuilt --dry-run --mode preview --provision=false
```

后台同理。`--prebuilt` 必须使用刚刚为同一模式构建的产物。预演不会验证占位资源是否存在，正式发布请使用根目录带保护检查的 `deploy:prod` / `deploy:preview`。

## GitHub Actions 首次配置

新项目继承 `.github/workflows/`，无需重新编写流水线。先完成自己的 Worker 名称、Hyperdrive、域名、生产数据库和商品配置，然后准备：

- GitHub CLI 已安装并通过 `gh auth login` 登录，有新仓库的管理权限。
- `origin` 指向新项目仓库，默认生产分支为 `main`，GitHub Actions 已启用。
- `apps/web/env.prod` 填写该项目完整的生产配置，包含构建期 `VITE_*`、可选 Sentry 配置与服务端配置；它不提交到 Git。
- Cloudflare API Token 限定到该项目账号，至少具备 Workers Scripts Edit、Workers Hyperdrive Read；配置自定义路由时还需要相应 Zone 的 Zone Read、Workers Routes Edit。按实际使用的绑定补充权限，不使用 Global API Key。

执行一次：

```sh
pnpm setup:github
```

脚本先显示目标仓库并要求确认，创建或更新 `production` Environment，读取 `apps/web/env.prod` 上传配置，通过 GitHub CLI 的隐藏输入收集 API Token。它不发布、不创建 Cloudflare 资源，也不执行数据库变更。GitHub Environment 是否可用取决于仓库可见性和账号方案；创建被拒绝时按 GitHub 返回的权限或方案提示处理。

| 位置                | 名称                    | 值                              |
| ------------------- | ----------------------- | ------------------------------- |
| production Variable | `CLOUDFLARE_ACCOUNT_ID` | 新项目 Cloudflare 账号 ID       |
| production Secret   | `CLOUDFLARE_API_TOKEN`  | 新项目受限 API Token            |
| production Secret   | `PRODUCTION_ENV_FILE`   | 完整的 `apps/web/env.prod` 内容 |

也可在 GitHub 仓库 Settings → Environments → production 手动填写。环境变量变更后再次执行 `pnpm setup:github` 同步，然后在 Actions 页面重新运行对应发布工作流。`VITE_*` 随应用构建进入浏览器；运行时密钥由发布脚本白名单筛选，随 Worker 版本一同发布。没有设置的可选密钥由 Cloudflare 保留；停用服务时需另行明确清除远端旧密钥。

## 日常 CI/CD

| Workflow             | 触发条件                                    | 执行内容                                                             |
| -------------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `check.yml`          | PR、非 main 分支 push；也供发布流程复用     | 安装锁定依赖、lint/格式、前后台构建、类型检查                        |
| `deploy-web.yml`     | main 的前台、共享包或发布配置变化；手动运行 | 检查通过后仅发布 web                                                 |
| `deploy-admin.yml`   | main 的后台、共享包或发布配置变化；手动运行 | 检查通过后仅发布 admin                                               |
| `deploy-service.yml` | 由两个发布 Workflow 调用                    | 读取 production 配置、构建并发布单个服务、清理临时密钥文件、记录结果 |

前后台独立发布，互不等待。共享包统一触发两者，新增共享包时无需维护包名清单；纯 docs 变更不发布。新增应用或根级构建配置时更新对应 `paths`。同一服务的生产发布串行，不中途取消正在执行的发布；构建前与上传前检查 main 最新提交，过期提交拒绝发布。

分支与 PR 检查不读取任何生产 Secret，使用无密钥构建并关闭所有可选服务。生产发布前通过 `env:check` 严格校验实际启用服务的配置。CI 构建生成应用产物、路由、翻译声明和 Worker 类型，不访问业务路由、不调用付费生成、不发信、不做浏览器或生产资源验收。可以将 PR 的 `check` job 设为分支保护必需检查。

生产发布固定使用 main；Actions 手动运行 `Deploy Web` / `Deploy Admin` 时也必须选 main。生产本机发布和本机密钥同步已由脚本拒绝。可在本机通过 CLI 触发 GitHub 工作流：

```sh
gh workflow run deploy-web.yml --ref main
gh workflow run deploy-admin.yml --ref main
```

schema 不随 CI 自动同步。涉及 schema 时先确认目标、兼容性并由用户授权执行对应数据库变更，再推送生产代码。前后台发布不是事务，一个成功另一个失败时，修复后重跑失败的 Workflow；完整上线以本次涉及的所有 Workflow 成功为准，不能以 push 成功代替。

参考：[Cloudflare CI](https://developers.cloudflare.com/cf/ci/)、[GitHub 可复用 Workflow](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)。

## 迁移验证与过渡文件

前后台的 production 和 preview 构建、预构建发布预演以及绑定类型生成后的类型检查已通过。没有登录、上传密钥或部署，也未验证真实数据库、登录、支付、Access、R2。完成自己的账号配置后，首次部署需逐项验证这些业务流程。

旧 `wrangler.jsonc` 暂时保留，按官方迁移流程在首次 cf 正式发布成功后再移除。新配置修改以 `cloudflare.config.ts` 为准，不再同步维护旧配置。Wrangler 仍是底层构建依赖。产物在 `.cloudflare/output/v0/`，绑定类型在 `.cloudflare/types/`。

参考：[cf 配置](https://developers.cloudflare.com/cf/projects/cloudflare-config/)、[cf 构建](https://developers.cloudflare.com/cf/projects/)、[Hyperdrive](https://developers.cloudflare.com/hyperdrive/)、[Access](https://developers.cloudflare.com/cloudflare-one/access-controls/)。官方文档已通过 Ref MCP 查询。

## 已登录却返回 403

cf 优先使用 `CLOUDFLARE_API_TOKEN`，其优先级高于登录后的 OAuth profile。旧 token 无权限时，重新登录不会改变这个优先级。根目录密钥同步和本地发布脚本会忽略这个变量，CI 继续使用 API token。

直接调用 cf 时，先在当前终端运行 `unset CLOUDFLARE_API_TOKEN`，再运行 `pnpm --dir apps/web exec cf auth whoami` 查看认证来源。不要将 token 或 OAuth 配置文件内容发到聊天中。如果 OAuth 仍然返回 403，再核对账号的目标资源权限。

参考：[官方认证优先级](https://developers.cloudflare.com/cf/get-started/index.md/#credential-order)。
