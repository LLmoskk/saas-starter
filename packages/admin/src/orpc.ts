import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type AnyRouter, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { toast } from "sonner";

import type { AdminContext } from "./server/context";

export function createAdminQueryClient() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onSuccess: (_data, query) => {
        if (typeof window !== "undefined") toast.dismiss(`query-error-${query.queryHash}`);
      },
      onError: (error, query) => {
        if (typeof window === "undefined" || !navigator.onLine) return;
        toast.error(`错误：${error.message}`, {
          id: `query-error-${query.queryHash}`,
          duration: Number.POSITIVE_INFINITY,
          action: {
            label: "重试",
            onClick: () => {
              void queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
            },
          },
        });
      },
    }),
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  });
  return queryClient;
}

/**
 * 服务端客户端按路径惰性解析。路由模块（含 Drizzle/pg）只能在真正调用时加载，
 * 否则 `utils/orpc.ts` 的静态依赖会把整个服务端依赖图拖进浏览器。
 */
function createLazyRouterClient<T>(load: () => Promise<unknown>, path: string[] = []): T {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return createLazyRouterClient(load, [...path, String(prop)]);
    },
    apply(_target, _thisArg, args: unknown[]) {
      return load().then((client) => {
        let value: unknown = client;
        for (const key of path) value = (value as Record<string, unknown>)[key];
        if (typeof value !== "function") {
          throw new Error(`Not an oRPC procedure: ${path.join(".")}`);
        }
        return (value as (...input: unknown[]) => unknown).apply(client, args);
      });
    },
  }) as T;
}

export function createAdminOrpc<T extends AnyRouter>({
  loadRouter,
  createContext,
}: {
  /** 用 `() => import("@/server/router")` 传入，客户端永远不会执行。 */
  loadRouter: () => Promise<T>;
  createContext: (args: { req: Request }) => Promise<AdminContext>;
}) {
  const getClient = createIsomorphicFn()
    .server((): RouterClient<T> => {
      // 每次调用重建 client：context 绑定当前请求的 getRequest()，缓存会串请求。
      const load = async () => {
        const router = await loadRouter();
        return createRouterClient(router as AnyRouter, {
          context: async () => createContext({ req: getRequest() }),
        }) as RouterClient<T>;
      };
      return createLazyRouterClient<RouterClient<T>>(load);
    })
    .client((): RouterClient<T> => {
      const link = new RPCLink({
        url: `${window.location.origin}/api/rpc`,
        fetch(url, options) {
          const init = options as RequestInit;
          const headers = new Headers(init.headers);
          headers.set(
            "x-admin-viewport",
            window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
          );
          return fetch(url, { ...init, headers, credentials: "include" });
        },
      });
      return createORPCClient(link) as RouterClient<T>;
    });

  const client = getClient();
  return { client, orpc: createTanstackQueryUtils(client) };
}
