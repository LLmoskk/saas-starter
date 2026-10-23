/**
 * 客户端安全入口：只导出 oRPC 客户端工厂。
 * 不要从 `@starter/admin/server` 引入这些函数——那个 barrel 会连带加载 Drizzle/pg。
 */
export { createAdminOrpc, createAdminQueryClient } from "./orpc";
