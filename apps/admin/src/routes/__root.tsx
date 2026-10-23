import { AdminToaster } from "@starter/admin/ui";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

import { adminConfig } from "@/admin-config";
import type { orpc } from "@/utils/orpc";
import css from "../index.css?url";

export type RouterAppContext = {
  orpc: typeof orpc;
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${adminConfig.brand.name} 运营后台` },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: css }],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang={adminConfig.locale} className={adminConfig.theme}>
      <head>
        <HeadContent />
      </head>
      <body className="h-full overflow-hidden bg-background text-foreground antialiased">
        <Outlet />
        <AdminToaster />
        <Scripts />
      </body>
    </html>
  );
}
