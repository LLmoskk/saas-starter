import { AsyncLocalStorage } from "node:async_hooks";
import type { D1Database } from "@cloudflare/workers-types";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export { schema };
export type Db = DrizzleD1Database<typeof schema> & { $client: D1Database };

export function createDb(binding: D1Database): Db {
  return drizzle(binding, { schema }) as Db;
}

const requestDb = new AsyncLocalStorage<Db>();

export function runWithDb<T>(instance: Db, fn: () => T): T {
  return requestDb.run(instance, fn);
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = requestDb.getStore();
    if (!instance) throw new Error("[db] D1 binding unavailable outside a Worker request");
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
