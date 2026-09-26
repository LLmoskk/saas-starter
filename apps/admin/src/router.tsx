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
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
};
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
