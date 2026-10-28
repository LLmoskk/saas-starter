import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const creditEntry = sqliteTable(
  "credit_entry",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    referenceId: text("reference_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("credit_entry_user_idx").on(table.userId),
    uniqueIndex("credit_entry_reason_ref_idx").on(table.reason, table.referenceId),
  ],
);

export const generationJob = sqliteTable(
  "generation_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    flowId: text("flow_id").notNull(),
    input: text("input", { mode: "json" })
      .$type<{
        prompt: string;
        references: { role: string; key: string; mime: string; size: number }[];
        options?: Record<string, unknown>;
      }>()
      .notNull(),
    status: text("status", {
      enum: ["queued", "running", "succeeded", "failed", "cancelled"],
    }).notNull(),
    creditCost: integer("credit_cost").notNull(),
    upstreamJobId: text("upstream_job_id"),
    outputKey: text("output_key"),
    outputMime: text("output_mime"),
    actualCost: text("actual_cost"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("generation_job_user_idx").on(table.userId, table.createdAt),
    index("generation_job_status_idx").on(table.status),
  ],
);
