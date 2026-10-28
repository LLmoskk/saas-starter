import type { D1Database } from "@cloudflare/workers-types";
import { createDb, runWithDb } from "./index";

export type WorkerEnv = { DB?: D1Database };
export type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

export function runInWorkerRequest<T>(bindings: WorkerEnv | undefined, fn: () => T): T {
  if (!bindings?.DB) throw new Error("Configure the DB D1 binding before starting the Worker");
  return runWithDb(createDb(bindings.DB), fn);
}
