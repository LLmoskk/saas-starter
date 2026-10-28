import { ORPCError } from "@orpc/server";
import { db } from "@starter/db";
import { session, user } from "@starter/db/schema/auth";
import { adminAuditEvent, adminIdempotency } from "@starter/db/schema/admin";
import { and, count, desc, eq, gt, like, isNotNull, isNull, or } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { fetchPaged, resolvePageSize } from "../pagination";
import type { UsersSearch } from "../search";

export async function listUsers(input: UsersSearch) {
  const page = input.page ?? 1;
  const pageSize = resolvePageSize(input.pageSize);
  const q = input.q?.trim();

  const conditions = [
    input.status === "disabled" ? isNotNull(user.disabledAt) : undefined,
    input.status === "active" ? isNull(user.disabledAt) : undefined,
    q ? or(like(user.email, `%${q}%`), like(user.name, `%${q}%`), eq(user.id, q)) : undefined,
  ].filter((condition) => condition !== undefined);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const paged = await fetchPaged(page, pageSize, async (targetPage) => {
    const [items, totals] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          disabledAt: user.disabledAt,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(where)
        .orderBy(desc(user.createdAt))
        .limit(pageSize)
        .offset((targetPage - 1) * pageSize),
      db.select({ total: count() }).from(user).where(where),
    ]);
    return { items, total: totals[0]?.total ?? 0 };
  });

  return {
    ...paged,
    items: paged.items.map((row) => ({ ...row, disabled: row.disabledAt != null })),
  };
}

/** 详情只暴露账户本身与会话元数据；额度、订单等业务数据由应用侧自行扩展。 */
export async function getUserDetail(userId: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      disabledAt: user.disabledAt,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const found = rows[0];
  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "未找到该用户" });
  }

  const sessions = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.createdAt))
    .limit(20);

  return {
    user: { ...found, disabled: found.disabledAt != null },
    sessions,
  };
}

const setUserDisabledResponseSchema = z.object({
  userId: z.string(),
  disabled: z.boolean(),
  changed: z.boolean(),
  sessionsRevoked: z.number().int().min(0),
});

export async function setUserDisabled(input: {
  userId: string;
  disabled: boolean;
  reason?: string;
  actorUserId: string;
  requestIp: string | null;
  idempotencyKey: string;
}) {
  const action = input.disabled ? "user_disable" : "user_restore";
  const [previous] = await db
    .select({
      action: adminIdempotency.action,
      targetId: adminIdempotency.targetId,
      response: adminIdempotency.response,
    })
    .from(adminIdempotency)
    .where(eq(adminIdempotency.key, input.idempotencyKey))
    .limit(1);
  if (previous) {
    if (previous.action !== action || previous.targetId !== input.userId)
      throw new ORPCError("CONFLICT", { message: "幂等键已被其他操作占用" });
    return { replayed: true, response: setUserDisabledResponseSchema.parse(previous.response) };
  }
  const [row] = await db
    .select({ disabledAt: user.disabledAt })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!row) throw new ORPCError("NOT_FOUND", { message: "未找到该用户" });
  const before = { disabled: row.disabledAt != null };
  const changed = before.disabled !== input.disabled;
  const [sessions] =
    input.disabled && changed
      ? await db.select({ total: count() }).from(session).where(eq(session.userId, input.userId))
      : [{ total: 0 }];
  const response = {
    userId: input.userId,
    disabled: input.disabled,
    changed,
    sessionsRevoked: sessions?.total ?? 0,
  };
  const statements: BatchItem<"sqlite">[] = [
    db.insert(adminIdempotency).values({
      key: input.idempotencyKey,
      action,
      targetId: input.userId,
      response,
    }),
    db.insert(adminAuditEvent).values({
      id: crypto.randomUUID(),
      actorUserId: input.actorUserId,
      action,
      targetType: "user",
      targetId: input.userId,
      reason: input.reason?.trim() || null,
      before,
      after: { disabled: input.disabled },
      idempotencyKey: input.idempotencyKey,
      requestIp: input.requestIp,
    }),
  ];
  if (changed) {
    statements.push(
      db
        .update(user)
        .set({ disabledAt: input.disabled ? new Date() : null })
        .where(eq(user.id, input.userId)),
    );
    if (input.disabled) statements.push(db.delete(session).where(eq(session.userId, input.userId)));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (error) {
    const [replayed] = await db
      .select({
        action: adminIdempotency.action,
        targetId: adminIdempotency.targetId,
        response: adminIdempotency.response,
      })
      .from(adminIdempotency)
      .where(eq(adminIdempotency.key, input.idempotencyKey))
      .limit(1);
    if (replayed?.action === action && replayed.targetId === input.userId)
      return { replayed: true, response: setUserDisabledResponseSchema.parse(replayed.response) };
    throw error;
  }
  return { replayed: false, response };
}
