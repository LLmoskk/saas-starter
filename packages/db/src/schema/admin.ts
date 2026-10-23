import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const adminAuditEvent = pgTable(
  "admin_audit_event",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    before: jsonb("before"),
    after: jsonb("after"),
    idempotencyKey: text("idempotency_key"),
    requestIp: text("request_ip"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_created_idx").on(table.createdAt),
    index("admin_audit_target_idx").on(table.targetType, table.targetId),
    index("admin_audit_idempotency_idx").on(table.idempotencyKey),
  ],
);

/** 写操作幂等记录：同一 key 重放返回首次响应，避免重复扣款/重复禁用。 */
export const adminIdempotency = pgTable(
  "admin_idempotency",
  {
    key: text("key").primaryKey(),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("admin_idempotency_created_idx").on(table.createdAt)],
);
