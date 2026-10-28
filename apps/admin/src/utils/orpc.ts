import { createIsomorphicFn } from "@tanstack/react-start";
import { createAdminOrpc, createAdminQueryClient } from "@starter/admin/client";

import type { AdminRouter } from "@/server/router";

// 只做类型引用；服务端路由通过动态 import 加载，避免进入浏览器依赖图。
const created = createAdminOrpc<AdminRouter>({
  loadRouter: createIsomorphicFn()
    .server(async () => (await import("@/server/router")).adminRouter)
    .client(() => {
      throw new Error("Server-only router loader");
    }),
  createContext: createIsomorphicFn()
    .server(async (args: { req: Request }) => (await import("@/server/router")).createContext(args))
    .client(() => {
      throw new Error("Server-only context loader");
    }),
});

export const client = created.client;
export const orpc = created.orpc;
export const createQueryClient = createAdminQueryClient;
