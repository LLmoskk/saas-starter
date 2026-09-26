import { env } from "@starter/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
export const db = drizzle(env.DATABASE_URL, { schema });
export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}
export { schema };
