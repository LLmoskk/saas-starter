import { env } from "@starter/env/server";
import { isWorkersRuntime } from "@starter/env/runtime";
import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "./schema";
export { schema };

export type Db = NodePgDatabase<typeof schema> & { $client: Pool };

export function createDb(connectionString?: string): Db {
  const url = connectionString ?? env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "[db] DATABASE_URL is not set. Node entry points (dev server, scripts) require it; Workers connect through the HYPERDRIVE binding instead.",
    );
  }
  const db = drizzle(url, { schema });

  // Listen on both clients and the pool so dropped sockets do not crash the process.
  const onDropped = (error: unknown) => {
    console.warn("[db] dropped connection", error);
  };
  db.$client.on("connect", (client) => client.on("error", onDropped));
  db.$client.on("error", onDropped);

  return db;
}

// Hyperdrive pools at the edge; Worker sockets must stay inside their request.
let nodeSingleton: Db | undefined;

function nodeDb(): Db {
  nodeSingleton ??= createDb();
  return nodeSingleton;
}

const requestDb = new AsyncLocalStorage<Db>();

/** Scope `fn` to a request-scoped database instance. The Workers server entry calls this once per request. */
export function runWithDb<T>(instance: Db, fn: () => T): T {
  return requestDb.run(instance, fn);
}

function currentDb(): Db {
  const scoped = requestDb.getStore();
  if (scoped) return scoped;
  if (isWorkersRuntime()) {
    throw new Error(
      "[db] accessed outside a request scope on Workers — the server entry must wrap every request in runWithDb()",
    );
  }
  return nodeDb();
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = currentDb();
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return prop in (currentDb() as object);
  },
});
