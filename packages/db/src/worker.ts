import { isWorkersRuntime } from "@starter/env/runtime";
import { createDb, runWithDb } from "./index";

export type WorkerEnv = { HYPERDRIVE?: { connectionString: string } };
export type WorkerContext = { waitUntil(promise: Promise<unknown>): void };

export function runInWorkerRequest<T>(bindings: WorkerEnv | undefined, fn: () => T): T {
  if (!isWorkersRuntime()) return fn();
  const connectionString = bindings?.HYPERDRIVE?.connectionString;
  if (!connectionString) throw new Error("Configure the HYPERDRIVE binding before deployment");
  return runWithDb(createDb(connectionString), fn);
}
