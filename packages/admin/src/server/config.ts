/**
 * Admin 安全配置。所有判断 fail-closed：白名单缺失、为空或环境不匹配时一律拒绝。
 */
import { env } from "@starter/env/server";
import { isWorkersRuntime } from "@starter/env/runtime";

export function parseAdminEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const allowlist = parseAdminEmails(env.ADMIN_EMAILS);
  if (allowlist.length === 0) return false;
  const normalized = email?.trim().toLowerCase();
  return normalized != null && allowlist.includes(normalized);
}

/** 部署到 Preview 时拒绝后台能力，避免未审查代码触达生产认证与数据库。 */
export function isPreviewDeployment(): boolean {
  return import.meta.env.MODE === "preview" || process.env.STARTER_ENV === "preview";
}

export function resolveAdminBaseUrl(): string {
  const explicit = env.ADMIN_BETTER_AUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (isWorkersRuntime() && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_BETTER_AUTH_URL is required when admin is deployed to Workers");
  }
  return "http://localhost:3002";
}

export function resolveAdminAuthSecret(): string {
  const explicit = env.ADMIN_BETTER_AUTH_SECRET ?? env.BETTER_AUTH_SECRET;
  if (!explicit || explicit.length < 32) {
    throw new Error(
      "ADMIN_BETTER_AUTH_SECRET (or BETTER_AUTH_SECRET) must be at least 32 characters",
    );
  }
  return explicit;
}

/** 审计记录用：提取转发链第一跳 IP。 */
export function getRequestIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}
