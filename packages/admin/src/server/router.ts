import { z } from "zod";

import { auditLogSearchSchema, usersSearchSchema } from "../search";
import { listAuditEvents } from "./audit-log";
import type { AdminAuth } from "./context";
import { getOverview } from "./overview";
import { createAdminProcedures } from "./procedures";
import { listUsers, getUserDetail, setUserDisabled } from "./users";

/**
 * 通用 Admin 路由。业务路由在应用侧展开组合：
 * `{ ...createAdminRouter({ auth }).router, payments, blog }`。
 */
export function createAdminRouter({ auth }: { auth: AdminAuth }) {
  const { createContext, publicProcedure, adminProcedure, desktopWriteProcedure } =
    createAdminProcedures({ auth });

  const router = {
    healthCheck: adminProcedure.handler(() => "OK"),
    me: adminProcedure.handler(({ context }) => context.admin),
    overview: {
      get: adminProcedure.handler(() => getOverview()),
    },
    users: {
      list: adminProcedure.input(usersSearchSchema).handler(({ input }) => listUsers(input)),
      detail: adminProcedure
        .input(z.object({ userId: z.string().min(1) }))
        .handler(({ input }) => getUserDetail(input.userId)),
      setDisabled: desktopWriteProcedure
        .input(
          z.object({
            userId: z.string().min(1),
            disabled: z.boolean(),
            reason: z.string().trim().max(500).optional(),
            idempotencyKey: z.string().uuid(),
          }),
        )
        .handler(({ input, context }) =>
          setUserDisabled({
            ...input,
            actorUserId: context.admin.id,
            requestIp: context.requestIp,
          }),
        ),
    },
    audit: {
      list: adminProcedure
        .input(auditLogSearchSchema)
        .handler(({ input }) => listAuditEvents(input)),
    },
  };

  return { router, createContext, publicProcedure, adminProcedure, desktopWriteProcedure };
}
