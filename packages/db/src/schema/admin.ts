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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("admin_audit_created_idx").on(table.createdAt)],
);
