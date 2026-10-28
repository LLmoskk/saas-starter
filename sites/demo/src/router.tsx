import "./instrument";
import { deLocalizeUrl, localizeUrl } from "./paraglide/runtime";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { createQueryClient, orpc } from "./utils/orpc";
export const getRouter = () => {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { orpc, queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: { input: ({ url }) => deLocalizeUrl(url), output: ({ url }) => localizeUrl(url) },
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
declare module "@tanstack/react-router" {
  // Router registration requires declaration merging.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
