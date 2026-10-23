import { db } from "@starter/db";
import { user } from "@starter/db/schema/auth";
import { count, sql } from "drizzle-orm";

import { daysAgo, startOfDay } from "../time";

export type Overview = Awaited<ReturnType<typeof getOverview>>;

export async function getOverview() {
  const now = new Date();
  const today = startOfDay(now);
  const day7 = daysAgo(7, now);
  const day30 = daysAgo(30, now);

  const [row] = await db
    .select({
      total: count(),
      newToday: sql<number>`count(*) filter (where ${user.createdAt} >= ${today})`,
      new7d: sql<number>`count(*) filter (where ${user.createdAt} >= ${day7})`,
      new30d: sql<number>`count(*) filter (where ${user.createdAt} >= ${day30})`,
    })
    .from(user);

  return {
    generatedAt: now,
    users: {
      total: Number(row?.total ?? 0),
      newToday: Number(row?.newToday ?? 0),
      new7d: Number(row?.new7d ?? 0),
      new30d: Number(row?.new30d ?? 0),
    },
  };
}
