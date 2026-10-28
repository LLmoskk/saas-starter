import { db } from "@starter/db";
import { user } from "@starter/db/schema/auth";
import { env } from "@starter/env/server";
import { eq } from "drizzle-orm";

import { getRequestIp, isPreviewDeployment } from "./config";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
};

export type AdminAuth = {
  api: {
    getSession: (input: { headers: Headers }) => Promise<{ user: AdminUser } | null>;
  };
};

export type AdminContext = {
  admin: AdminUser | null;
  siteId: string | null;
  requestIp: string | null;
  /** 客户端上报的视口类别：高风险写操作在服务端同样拒绝 mobile */
  clientViewport: "desktop" | "mobile";
};

async function getDevAdmin(): Promise<AdminUser | null> {
  const email = env.ADMIN_DEV_EMAIL;
  // 只在本地 dev server 生效；任何构建产物（staging/preview/prod）都不得免登录。
  if (!email || !import.meta.env.DEV || isPreviewDeployment()) return null;
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminContext({
  req,
  auth,
}: {
  req: Request;
  auth: AdminAuth;
}): Promise<AdminContext> {
  const base = {
    siteId:
      req.headers
        .get("cookie")
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("admin-site="))
        ?.slice("admin-site=".length) ?? null,
    requestIp: getRequestIp(req),
    clientViewport:
      req.headers.get("x-admin-viewport") === "mobile" ? ("mobile" as const) : ("desktop" as const),
  };

  // Preview 短路：请求不得因解析 Session 而触达生产数据库
  if (isPreviewDeployment()) {
    return { ...base, admin: null };
  }

  const devAdmin = await getDevAdmin();
  if (devAdmin) {
    return { ...base, admin: devAdmin };
  }

  const session = await auth.api.getSession({ headers: req.headers });
  return { ...base, admin: session?.user ?? null };
}
