import { adminRouter } from "@/server/router";
import { createContext } from "@/server/orpc";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
export const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } });
const getClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(adminRouter, { context: async () => createContext({ req: getRequest() }) }),
  )
  .client((): RouterClient<typeof adminRouter> =>
    createORPCClient(
      new RPCLink({
        url: `${window.location.origin}/api/rpc`,
        fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
      }),
    ),
  );
export const orpc = createTanstackQueryUtils(getClient());
