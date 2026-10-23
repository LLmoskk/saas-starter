import { z } from "zod";

import { pageSizeSearchSchema } from "./pagination";

/** 用户列表 URL search：非法值 fail-soft，避免手改地址栏把页面打崩。 */
export const usersSearchSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  status: z.enum(["all", "active", "disabled"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: pageSizeSearchSchema,
});

export type UsersSearch = z.infer<typeof usersSearchSchema>;

export const auditLogSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: pageSizeSearchSchema,
});

export type AuditLogSearch = z.infer<typeof auditLogSearchSchema>;
