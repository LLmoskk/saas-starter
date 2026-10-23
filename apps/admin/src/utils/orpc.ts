import { createAdminOrpc, createAdminQueryClient } from "@starter/admin/client";

import type { AdminRouter } from "@/server/router";

// 只做类型引用；服务端路由通过动态 import 加载，避免进入浏览器依赖图。
const created = createAdminOrpc<AdminRouter>({
  loadRouter: async () => (await import("@/server/router")).adminRouter,
  createContext: async (args) => (await import("@/server/router")).createContext(args),
});

export const client = created.client;
export const orpc = created.orpc;
export const createQueryClient = createAdminQueryClient;
