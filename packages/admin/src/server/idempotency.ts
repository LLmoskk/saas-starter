import { ORPCError } from "@orpc/server";
import { adminIdempotency } from "@starter/db/schema/admin";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import type { AuditExecutor } from "./audit";

/**
 * 幂等写操作：同一 key 重放时返回首次结果，不重复业务变更与审计。
 * 调用方应在本事务内先锁定目标行，再调用本函数。
 */
export async function runIdempotent<T>(
  executor: AuditExecutor,
  options: {
    key: string;
    action: string;
    targetId: string;
    responseSchema: z.ZodType<T>;
    run: () => Promise<T>;
  },
): Promise<{ replayed: boolean; response: T }> {
  const existing = await executor
    .select({
      action: adminIdempotency.action,
      targetId: adminIdempotency.targetId,
      response: adminIdempotency.response,
    })
    .from(adminIdempotency)
    .where(eq(adminIdempotency.key, options.key))
    .limit(1);

  if (existing[0]) {
    if (existing[0].action !== options.action || existing[0].targetId !== options.targetId) {
      throw new ORPCError("CONFLICT", { message: "幂等键已被其他操作占用" });
    }
    const parsed = options.responseSchema.safeParse(existing[0].response);
    if (!parsed.success) {
      throw new ORPCError("INTERNAL", { message: "幂等记录损坏" });
    }
    return { replayed: true, response: parsed.data };
  }

  const response = await options.run();
  await executor.insert(adminIdempotency).values({
    key: options.key,
    action: options.action,
    targetId: options.targetId,
    response: response as never,
  });
  return { replayed: false, response };
}
