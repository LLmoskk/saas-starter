import { db } from "@starter/db";
import { creditEntry, generationJob } from "@starter/db/schema/generation";
import { createNodeYirClient } from "@yir-ai/sdk/server";
import type { Workflow, R2Bucket } from "@cloudflare/workers-types";
import { and, desc, eq, sql } from "drizzle-orm";
import type { GenerationFlow, GenerationInput } from "./index";

export type GenerationBinding = {
  GENERATION_WORKFLOW: Workflow<{ jobId: string }>;
  MEDIA: R2Bucket;
};

export async function creditBalance(userId: string): Promise<number> {
  // ponytail: Sum the user's ledger for the starter; add a cached balance only if ledgers grow large.
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${creditEntry.amount}), 0)` })
    .from(creditEntry)
    .where(eq(creditEntry.userId, userId));
  return Number(row?.balance ?? 0);
}

export async function listJobs(userId: string) {
  return db
    .select()
    .from(generationJob)
    .where(eq(generationJob.userId, userId))
    .orderBy(desc(generationJob.createdAt))
    .limit(50);
}

export async function getJob(userId: string, id: string) {
  const [job] = await db
    .select()
    .from(generationJob)
    .where(and(eq(generationJob.id, id), eq(generationJob.userId, userId)))
    .limit(1);
  return job ?? null;
}

export async function createJob(
  userId: string,
  id: string,
  flow: GenerationFlow,
  input: GenerationInput,
  bindings: GenerationBinding,
) {
  if (!Number.isSafeInteger(flow.creditCost) || flow.creditCost < 1 || flow.steps.length === 0)
    throw new Error("Generation flow requires a positive credit cost and at least one step");
  if (flow.steps.some((step) => !step.model || !/^\d+(?:\.\d{1,6})?$/.test(step.maxCost)))
    throw new Error("Generation flow requires a model and USD cost ceiling for every step");
  if (
    input.references.length < (flow.minReferences ?? 0) ||
    input.references.length > (flow.maxReferences ?? 5)
  )
    throw new Error("Incorrect number of reference images");
  for (const reference of input.references) {
    if (
      !reference.key.startsWith(`users/${userId}/`) ||
      !/^image\/(png|jpeg|webp)$/.test(reference.mime) ||
      reference.size > 12_000_000
    )
      throw new Error("Invalid reference image");
    const stored = await bindings.MEDIA.head(reference.key);
    if (!stored || stored.size !== reference.size) throw new Error("Reference image unavailable");
  }
  const createdAt = Date.now();
  await db.$client.batch([
    db.$client
      .prepare(`
      INSERT INTO generation_job
        (id, user_id, flow_id, input, status, credit_cost, created_at, updated_at)
      SELECT ?, ?, ?, ?, 'queued', ?, ?, ?
      WHERE COALESCE((SELECT SUM(amount) FROM credit_entry WHERE user_id = ?), 0) >= ?
      ON CONFLICT (id) DO NOTHING
    `)
      .bind(
        id,
        userId,
        flow.id,
        JSON.stringify(input),
        flow.creditCost,
        createdAt,
        createdAt,
        userId,
        flow.creditCost,
      ),
    db.$client
      .prepare(`
      INSERT INTO credit_entry (id, user_id, amount, reason, reference_id, created_at)
      SELECT ?, ?, ?, 'generation', ?, ?
      WHERE EXISTS (SELECT 1 FROM generation_job WHERE id = ? AND user_id = ?)
      ON CONFLICT (reason, reference_id) DO NOTHING
    `)
      .bind(`generation:${id}`, userId, -flow.creditCost, id, createdAt, id, userId),
  ]);
  const job = await getJob(userId, id);
  if (!job) throw new Error("Insufficient credits");
  if (job.flowId !== flow.id || JSON.stringify(job.input) !== JSON.stringify(input))
    throw new Error("Idempotency key belongs to another request");
  if (job.status === "cancelled" || job.status === "failed")
    throw new Error("This generation request is already closed");
  try {
    await bindings.GENERATION_WORKFLOW.create({ id, params: { jobId: id } });
  } catch (error) {
    // A retry may find the already-created Workflow instance. Other failures keep
    // the queued job so the same request can safely retry instance creation.
    const instance = await bindings.GENERATION_WORKFLOW.get(id).catch(() => null);
    if (!instance) throw error;
  }
  return job;
}

export async function cancelJob(
  userId: string,
  id: string,
  bindings: GenerationBinding & { YIR_API_KEY?: string; YIR_BASE_URL?: string },
) {
  const job = await getJob(userId, id);
  if (!job) throw new Error("Generation not found");
  if (job.status === "succeeded" || job.status === "failed") return job;
  const now = Date.now();
  await db.$client.batch([
    db.$client
      .prepare(`
      UPDATE generation_job SET status = 'cancelled', updated_at = ?
      WHERE id = ? AND user_id = ? AND status IN ('queued', 'running')
    `)
      .bind(now, id, userId),
    db.$client
      .prepare(`
      INSERT INTO credit_entry (id, user_id, amount, reason, reference_id, created_at)
      SELECT ?, user_id, credit_cost, 'generation_refund', id, ?
      FROM generation_job WHERE id = ? AND user_id = ? AND status = 'cancelled'
      ON CONFLICT (reason, reference_id) DO NOTHING
    `)
      .bind(`refund:${id}`, now, id, userId),
  ]);
  const instance = await bindings.GENERATION_WORKFLOW.get(id).catch(() => null);
  if (instance) await instance.terminate().catch(() => undefined);
  if (job.upstreamJobId && bindings.YIR_API_KEY) {
    const client = createNodeYirClient({
      apiKey: bindings.YIR_API_KEY,
      ...(bindings.YIR_BASE_URL ? { baseURL: bindings.YIR_BASE_URL } : {}),
    });
    await client.cancelJob(job.upstreamJobId).catch(() => undefined);
  }
  return getJob(userId, id);
}
