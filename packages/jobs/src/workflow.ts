import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { createNodeYirClient, createAndUploadFile, validateGeneration } from "@yir-ai/sdk/server";
import type {
  StandardImageGenerationRequest,
  StandardVideoGenerationRequest,
} from "@yir-ai/sdk/shared";
import { createDb } from "@starter/db";
import { generationJob } from "@starter/db/schema/generation";
import { and, eq } from "drizzle-orm";
import type { GenerationFlow, GenerationInput } from "./index";

export type JobsEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  YIR_API_KEY: string;
  YIR_BASE_URL?: string;
};

function micros(amount: string): number {
  if (!/^\d+(?:\.\d{1,6})?$/.test(amount)) throw new Error("Invalid USD amount");
  return Number(amount) * 1_000_000;
}

export function defineGenerationWorkflow(flows: readonly GenerationFlow[]) {
  return class GenerationWorkflow extends WorkflowEntrypoint<JobsEnv, { jobId: string }> {
    override async run(event: Readonly<WorkflowEvent<{ jobId: string }>>, step: WorkflowStep) {
      const { DB, MEDIA, YIR_API_KEY, YIR_BASE_URL } = this.env;
      const database = createDb(DB);
      const [job] = await database
        .select()
        .from(generationJob)
        .where(eq(generationJob.id, event.payload.jobId))
        .limit(1);
      if (!job || job.status === "cancelled" || job.status === "succeeded") return;
      const flow = flows.find((item) => item.id === job.flowId);
      if (!flow || !YIR_API_KEY) {
        await fail("Generation is not configured");
        return;
      }
      const client = createNodeYirClient({
        apiKey: YIR_API_KEY,
        ...(YIR_BASE_URL ? { baseURL: YIR_BASE_URL } : {}),
      });
      const input = job.input as GenerationInput;
      async function isRunning() {
        const [current] = await database
          .select({ status: generationJob.status })
          .from(generationJob)
          .where(eq(generationJob.id, job!.id))
          .limit(1);
        return current?.status === "running";
      }

      async function fail(message: string) {
        const now = Date.now();
        await DB.batch([
          DB.prepare(`
            UPDATE generation_job SET status = 'failed', error = ?, updated_at = ?
            WHERE id = ? AND status IN ('queued', 'running')
          `).bind(message, now, job!.id),
          DB.prepare(`
            INSERT INTO credit_entry (id, user_id, amount, reason, reference_id, created_at)
            SELECT ?, user_id, credit_cost, 'generation_refund', id, ?
            FROM generation_job WHERE id = ? AND status = 'failed'
            ON CONFLICT (reason, reference_id) DO NOTHING
          `).bind(`refund:${job!.id}`, now, job!.id),
        ]);
      }

      try {
        await step.do("running", async () => {
          await database
            .update(generationJob)
            .set({ status: "running", updatedAt: new Date() })
            .where(and(eq(generationJob.id, job.id), eq(generationJob.status, "queued")));
          return true;
        });
        if (!(await isRunning())) return;
        const uploaded = await Promise.all(
          input.references.map((reference, index) =>
            step.do(`upload:${index}`, async () => {
              const object = await MEDIA.get(reference.key);
              if (!object || object.size !== reference.size)
                throw new Error("Reference file unavailable");
              const bytes = await object.arrayBuffer();
              const file = await createAndUploadFile(
                client,
                {
                  name: `reference-${index}`,
                  media_type: reference.mime,
                  size: reference.size,
                },
                new Blob([bytes], { type: reference.mime }),
                `${job.id}:file:${index}`,
              );
              return { role: reference.role, fileId: file.id };
            }),
          ),
        );
        let previous: { url: string; mediaType: string } | undefined;
        let totalCostMicros = 0;
        for (const [index, part] of flow.steps.entries()) {
          if (!(await isRunning())) return;
          const { parameters, ...requestInput } = part.build({ input, uploaded, previous });
          const body = { model: part.model, input: requestInput, parameters: parameters ?? {} };
          const path = part.kind === "video" ? "generate_video" : "generate_image";
          validateGeneration(path, body);
          const quote = await step.do(`quote:${index}`, async () => {
            const result =
              part.kind === "video"
                ? await client.quoteVideo(body as StandardVideoGenerationRequest)
                : await client.quoteImage(body as StandardImageGenerationRequest);
            return {
              available: result.supply?.available ?? null,
              currency: result.currency ?? null,
              expected: result.expected_amount ?? result.primary?.amount ?? null,
            };
          });
          if (
            quote.available === false ||
            quote.currency !== "USD" ||
            !quote.expected ||
            micros(quote.expected) > micros(part.maxCost)
          )
            throw new Error(
              "Generation exceeds the configured cost ceiling or model is unavailable",
            );
          const upstreamId = await step.do(`submit:${index}`, async () => {
            if (!(await isRunning())) throw new Error("Generation cancelled");
            const submitted =
              part.kind === "video"
                ? await client.submitVideo(
                    { ...body, max_cost: part.maxCost } as StandardVideoGenerationRequest,
                    `${job.id}:${index}`,
                  )
                : await client.submitImage(
                    { ...body, max_cost: part.maxCost } as StandardImageGenerationRequest,
                    `${job.id}:${index}`,
                  );
            return submitted.id;
          });
          await step.do(`record:${index}`, async () => {
            await database
              .update(generationJob)
              .set({ upstreamJobId: upstreamId, updatedAt: new Date() })
              .where(eq(generationJob.id, job.id));
            if (!(await isRunning())) await client.cancelJob(upstreamId).catch(() => undefined);
            return true;
          });
          if (!(await isRunning())) return;
          let result: { url: string; mediaType: string; charged: string | null } | undefined;
          for (let attempt = 0; attempt < 180; attempt++) {
            if (!(await isRunning())) return;
            const status = await step.do(`poll:${index}:${attempt}`, async () => {
              const response = await client.getJobStatus(upstreamId, { waitSeconds: 20 });
              return { status: response.status, error: response.error?.message ?? null };
            });
            if (status.status === "failed" || status.status === "cancelled")
              throw new Error(status.error ?? `Upstream ${status.status}`);
            if (status.status === "succeeded") {
              result = await step.do(`result:${index}`, async () => {
                const response = await client.getJob(upstreamId);
                if (response.result?.availability !== "available" || !response.result.files[0])
                  throw new Error("Generation result unavailable");
                return {
                  url: response.result.files[0].url,
                  mediaType: response.result.files[0].media_type,
                  charged: response.billing?.total_charged_by_yir ?? null,
                };
              });
              break;
            }
            await step.sleep(`wait:${index}:${attempt}`, 2_000);
          }
          if (!result) throw new Error("Generation result unavailable");
          previous = { url: result.url, mediaType: result.mediaType };
          if (result.charged) totalCostMicros += micros(result.charged);
        }
        if (!previous) throw new Error("Generation produced no result");
        const output = previous;
        const key = `jobs/${job.id}/output`;
        await step.do("store", async () => {
          if (!(await isRunning())) return true;
          const response = await fetch(output.url);
          if (!response.ok || !response.body) throw new Error("Unable to store result");
          await MEDIA.put(key, response.body as unknown as Parameters<typeof MEDIA.put>[1], {
            httpMetadata: { contentType: output.mediaType },
          });
          return true;
        });
        await step.do("finish", async () => {
          await database
            .update(generationJob)
            .set({
              status: "succeeded",
              outputKey: key,
              outputMime: output.mediaType,
              actualCost: (totalCostMicros / 1_000_000).toFixed(6),
              updatedAt: new Date(),
            })
            .where(and(eq(generationJob.id, job.id), eq(generationJob.status, "running")));
          return true;
        });
      } catch (error) {
        await step.do("fail", () => fail(error instanceof Error ? error.message : String(error)));
      }
    }
  };
}
