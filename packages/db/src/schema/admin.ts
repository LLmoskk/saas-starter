import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const adminAuditEvent = sqliteTable(
  "admin_audit_event",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    before: text("before", { mode: "json" }),
    after: text("after", { mode: "json" }),
    idempotencyKey: text("idempotency_key"),
    requestIp: text("request_ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("admin_audit_created_idx").on(table.createdAt),
    index("admin_audit_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_idempotency_idx").on(table.idempotencyKey),
  ],
);

/** 写操作幂等记录：同一 key 重放返回首次响应，避免重复扣款/重复禁用。 */
export const adminIdempotency = sqliteTable(
  "admin_idempotency",
  {
    key: text("key").primaryKey(),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    response: text("response", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("admin_idempotency_created_idx").on(table.createdAt)],
);
