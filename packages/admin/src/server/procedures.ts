import { ORPCError, os } from "@orpc/server";

import type { AdminAuth, AdminContext } from "./context";
import { createAdminContext } from "./context";
import { isAdminEmail, isPreviewDeployment } from "./config";

export function createAdminProcedures({ auth }: { auth: AdminAuth }) {
  const o = os.$context<AdminContext>();

  const requireAdmin = o.middleware(({ context, next }) => {
    if (isPreviewDeployment()) {
      throw new ORPCError("FORBIDDEN", { message: "Preview 环境不允许访问运营后台" });
    }
    const admin = context.admin;
    if (!admin) {
      throw new ORPCError("UNAUTHORIZED");
    }
    if (!isAdminEmail(admin.email)) {
      throw new ORPCError("FORBIDDEN", { message: "此账号未被授权访问运营后台" });
    }
    return next({ context: { ...context, admin } });
  });

  const adminProcedure = o.use(requireAdmin);

  /** 高风险写操作闸门：移动端视口在服务端同样拒绝。 */
  const desktopWriteProcedure = adminProcedure.use(({ context, next }) => {
    if (context.clientViewport === "mobile") {
      throw new ORPCError("FORBIDDEN", {
        message: "该操作仅支持桌面端，请改用桌面浏览器",
      });
    }
    return next({ context });
  });

  return {
    publicProcedure: o,
    createContext: ({ req }: { req: Request }) => createAdminContext({ req, auth }),
    adminProcedure,
    desktopWriteProcedure,
  };
}
