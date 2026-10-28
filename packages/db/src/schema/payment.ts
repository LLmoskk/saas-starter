import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
export const payment = sqliteTable(
  "payment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderId: text("order_id").notNull(),
    paymentId: text("payment_id"),
    productId: text("product_id"),
    productName: text("product_name"),
    amount: text("amount"),
    currency: text("currency"),
    status: text("status").notNull(),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("payment_user_idx").on(table.userId),
    uniqueIndex("payment_payment_id_idx").on(table.paymentId),
  ],
);
export const subscription = sqliteTable(
  "subscription",
  {
    orderId: text("order_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    productName: text("product_name"),
    status: text("status").notNull(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("subscription_user_idx").on(table.userId)],
);
export const webhookEvent = sqliteTable("webhook_event", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: integer("processed_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});
