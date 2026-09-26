import { env } from "@starter/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
export function createDb() {
  const db = drizzle(env.DATABASE_URL, { schema });
  const onDropped = (error: unknown) => console.warn("[db] dropped connection", error);
  db.$client.on("connect", (client) => client.on("error", onDropped));
  db.$client.on("error", onDropped);
  return db;
}
export const db = createDb();
export { schema };
