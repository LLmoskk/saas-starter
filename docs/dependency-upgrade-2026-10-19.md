# 2026-10-19 依赖升级记录

## 更新范围

前台与后台同步升级依赖和 pnpm 锁文件，共享版本通过 catalog 管理。

| 依赖组                                  | 更新后的版本                 |
| --------------------------------------- | ---------------------------- |
| React / React DOM                       | 19.3.1                       |
| Start / Router / SSR Query              | 1.169.3 / 1.170.45 / 1.167.3 |
| TanStack Query                          | 5.104.4                      |
| Better Auth / oRPC                      | 1.7.11 / 1.15.7              |
| Vite / React 插件 / OXC React transform | 8.3.4 / 6.1.2 / 0.152.0      |
| Cloudflare Vite 插件 / Wrangler         | 1.64.0 / 4.151.1             |
| Waffo SDK                               | 0.26.0                       |
| Sentry SDK / Vite 插件                  | 10.76.2 / 5.4.1              |
| Drizzle ORM / Kit / pg                  | 0.45.4 / 0.31.11 / 8.23.1    |
| Paraglide / Zod                         | 2.29.0 / 4.6.7               |

数据库、存储与开发工具的兼容更新一并纳入。Sentry 11、dotenv 18 等另需迁移的大版本未纳入。

## 配套修改

- 博客 server function 使用当前发布包支持的 `.validator()`，保留原有 schema。
- 前台插件顺序改为 Cloudflare → Start → React。
- Paraglide 显式设置 `strategy: ["url", "cookie", "baseLocale"]`。原配置访问 `/zh-CN` 会回到英文页；修改后中文首页与登录页已确认正常。
- 更新间接依赖，对 Better Auth 的可选 Solid peer 设置兼容的 1.9.17 下限，使用修复后的 seroval。
- 保留升级前已存在的 Waffo 支付逻辑、文档和技能修改。

## 检查结果

- web/admin 类型检查与 Workers 构建通过。
- lint、修改文件的格式检查、`git diff --check` 和 frozen lockfile 安装通过。
- 浏览器检查了英文和中文首页、登录页、注册模式切换、390px 移动端布局以及后台入口。web/admin 的未登录会话接口均返回 HTTP 200 / null。
- 临时测试商户 ID 最初不符合 SDK 的 22 位短 ID 规则，导致 HTTP 400；修正临时配置后恢复，未修改业务逻辑以绕过校验。临时配置与诊断代码已删除。
- 生产及完整依赖审计均无 high / critical，各剩一项 Drizzle Kit 旧 esbuild 的 moderate 告警。
- 该模板没有现成测试套件。本次没有配置真实数据库、商户和 OAuth，未验证真实注册、支付、邮件、内容发布与存储上传。

## 官方资料

通过 Ref MCP 阅读了 [Cloudflare 的 TanStack Start 配置](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start#configure-an-existing-application) 和 [Paraglide 语言策略](https://github.com/opral/inlang-paraglide-js/blob/main/docs/strategy.md#built-in-strategies)。Waffo 0.26 的发布包 CHANGELOG 确认新增客户门户方法，结账和会话签名保持兼容。
