import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";
export const payment = pgTable(
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
    paidAt: timestamp("paid_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("payment_user_idx").on(table.userId),
    uniqueIndex("payment_payment_id_idx").on(table.paymentId),
  ],
);
export const subscription = pgTable(
  "subscription",
  {
    orderId: text("order_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    productName: text("product_name"),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("subscription_user_idx").on(table.userId)],
);
export const webhookEvent = pgTable("webhook_event", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});
