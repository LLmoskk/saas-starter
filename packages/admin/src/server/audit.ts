import type { Db } from "@starter/db";
import { adminAuditEvent } from "@starter/db/schema/admin";

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type AuditExecutor = Db | Transaction;

export type AdminAuditInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  /** 结构化前后值；禁止写入创作内容、原始供应商响应或任何凭证。 */
  before?: unknown;
  after?: unknown;
  idempotencyKey?: string | null;
  requestIp?: string | null;
};

/**
 * 追加一条不可变审计事件。写操作必须与业务变更同事务调用，
 * 审计失败会让整个事务回滚。
 */
export async function recordAdminAudit(
  executor: AuditExecutor,
  input: AdminAuditInput,
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  await executor.insert(adminAuditEvent).values({
    id,
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason?.trim() || null,
    before: (input.before ?? null) as never,
    after: (input.after ?? null) as never,
    idempotencyKey: input.idempotencyKey ?? null,
    requestIp: input.requestIp ?? null,
  });
  return { id };
}
