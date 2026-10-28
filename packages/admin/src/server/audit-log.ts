import { db } from "@starter/db";
import { adminAuditEvent } from "@starter/db/schema/admin";
import { count, desc } from "drizzle-orm";

import { fetchPaged, resolvePageSize } from "../pagination";
import type { AuditLogSearch } from "../search";

export type AuditEventListItem = Awaited<ReturnType<typeof listAuditEvents>>["items"][number];

export async function listAuditEvents(input: AuditLogSearch = {}) {
  const page = input.page ?? 1;
  const pageSize = resolvePageSize(input.pageSize);

  return fetchPaged(page, pageSize, async (targetPage) => {
    const [rows, totals] = await Promise.all([
      db
        .select({
          id: adminAuditEvent.id,
          action: adminAuditEvent.action,
          targetType: adminAuditEvent.targetType,
          targetId: adminAuditEvent.targetId,
          reason: adminAuditEvent.reason,
          before: adminAuditEvent.before,
          after: adminAuditEvent.after,
          requestIp: adminAuditEvent.requestIp,
          createdAt: adminAuditEvent.createdAt,
          actorEmail: adminAuditEvent.actorUserId,
        })
        .from(adminAuditEvent)
        .orderBy(desc(adminAuditEvent.createdAt), desc(adminAuditEvent.id))
        .limit(pageSize)
        .offset((targetPage - 1) * pageSize),
      db.select({ total: count() }).from(adminAuditEvent),
    ]);
    return { items: rows, total: totals[0]?.total ?? 0 };
  });
}
