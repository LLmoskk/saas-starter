import { AdminShell } from "@starter/admin/ui";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { adminConfig } from "@/admin-config";
import { adminAuthClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_admin")({
  // 客户端守卫仅负责展示层跳转；真正的授权在每个 Admin procedure 的服务端中间件里
  loader: async ({ context }) => {
    try {
      return await context.queryClient.ensureQueryData(context.orpc.me.queryOptions());
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const me = Route.useLoaderData();

  return (
    <AdminShell
      me={me}
      nav={adminConfig.nav}
      onSignOut={async () => {
        await adminAuthClient.signOut();
        window.location.href = "/login";
      }}
    >
      <Outlet />
    </AdminShell>
  );
}
