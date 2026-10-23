# @starter/admin

可复用的运营后台内核：服务端 procedure、客户端 oRPC 接线、UI 套件与基础主题。业务路由、品牌和配色留在各自应用里。

## 入口

| 入口                                      | 用途                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `@starter/admin/server`                   | `createAdminRouter`、审计、幂等、通用用户/总览查询        |
| `@starter/admin/server-config`            | 邮箱白名单、baseURL/secret 解析（服务端）                 |
| `@starter/admin/client`                   | `createAdminOrpc`、`createAdminQueryClient`（客户端安全） |
| `@starter/admin/ui`                       | Shell、表格、弹窗、分页、状态徽标等组件                   |
| `@starter/admin/config`                   | `defineAdminConfig` / `getAdminConfig`                    |
| `@starter/admin/styles.css`               | 基础主题与组件类                                          |
| `@starter/admin/{pagination,search,time}` | 分页、搜索参数与时间工具                                  |

## 接入

1. 应用侧定义配置：`defineAdminConfig({ brand, theme, nav, locale, timeZone, ... })`。
2. 服务端组装路由：`createAdminRouter({ auth })`，再展开业务 procedure。
3. 客户端接线：`createAdminOrpc({ loadRouter: () => import("./server/router"), createContext })`。
4. 引入样式：`@import "@starter/admin/styles.css";`，再在 `:root` 覆盖品牌色。

## 主题覆盖

```css
:root {
  --primary: #38bdf8;
  --background: #090c0f;
  --card: #10151a;
  --border: #222c36;
  --radius: 8px; /* 圆角与派生色都会跟随 */
}
```

`theme: "dark" | "light"` 控制根节点 class 与 toast 主题；浅色后台需要自行覆盖中性色 token。UI 组件自身不带业务文案，导航与登录文案来自 `AdminConfig`。

## 安全约定

- 所有通用与业务 procedure 都经过同一套服务端中间件（preview 拒绝、白名单、桌面端写操作闸门）。
- 高风险写操作带幂等键并写入不可变审计记录。
- `ADMIN_DEV_EMAIL` 只在本地 dev server 生效；构建产物（staging/preview/prod）一律忽略。

## 自检

```bash
pnpm --filter @starter/admin check
```
