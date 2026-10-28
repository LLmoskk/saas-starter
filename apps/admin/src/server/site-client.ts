import { ORPCError } from "@orpc/server";
import type { AdminContext } from "@starter/admin/server";
import { env } from "@starter/env/server";
import { siteRegistry } from "@/sites";

function siteMap(raw: string | undefined, label: string): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || !parsed || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, string>;
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: `${label}配置无效` });
  }
}

export function selectedSite(siteId: string | null) {
  const site = siteRegistry.find((item) => item.id === (siteId ?? siteRegistry[0]?.id));
  if (!site) throw new ORPCError("BAD_REQUEST", { message: "未知站点" });
  return site;
}

export async function siteRequest<T>(
  context: Pick<AdminContext, "siteId" | "admin">,
  action: string,
  input?: unknown,
): Promise<T> {
  const site = selectedSite(context.siteId);
  const token = siteMap(env.ADMIN_SITE_TOKENS, "站点访问凭证")[site.id];
  if (typeof token !== "string" || token.length < 32)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "站点访问凭证未配置" });
  const siteUrl = siteMap(env.ADMIN_SITE_URLS, "站点地址")[site.id];
  if (!siteUrl) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "站点地址未配置" });
  const url = new URL("/api/internal/admin", siteUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "站点地址必须使用 HTTPS" });
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, input, actor: context.admin?.email ?? "admin@local.invalid" }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ORPCError("BAD_GATEWAY", { message: "站点连接失败" });
  }
  const body = await response.text();
  if (!response.ok)
    throw new ORPCError("BAD_GATEWAY", { message: `站点请求失败 (${response.status})` });
  return JSON.parse(body, (key, value: unknown) =>
    typeof value === "string" && /(At|End)$/.test(key) && /^\d{4}-\d\d-\d\dT/.test(value)
      ? new Date(value)
      : value,
  ) as T;
}
