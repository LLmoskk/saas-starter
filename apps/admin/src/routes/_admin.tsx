import { AdminShell } from "@starter/admin/ui";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { adminConfig } from "@/admin-config";
import { adminAuthClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { Select } from "@starter/ui";
import { useQuery } from "@tanstack/react-query";

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
  const sites = useQuery(orpc.sites.queryOptions());

  return (
    <AdminShell
      me={me}
      nav={adminConfig.nav}
      onSignOut={async () => {
        await adminAuthClient.signOut();
        window.location.href = "/login";
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <label htmlFor="admin-site" className="font-semibold">
          站点
        </label>
        <Select
          id="admin-site"
          className="max-w-64"
          value={sites.data?.selected ?? ""}
          onChange={(event) => {
            document.cookie = `admin-site=${encodeURIComponent(event.target.value)}; Path=/; SameSite=Lax`;
            window.location.reload();
          }}
        >
          {sites.data?.items.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      </div>
      <Outlet />
    </AdminShell>
  );
}
