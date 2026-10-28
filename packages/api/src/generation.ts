import { ORPCError } from "@orpc/server";
import {
  cancelJob,
  createJob,
  creditBalance,
  getJob,
  listJobs,
  type GenerationBinding,
} from "@starter/jobs/server";
import type { GenerationFlow } from "@starter/jobs";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "./index";

const reference = z.object({
  role: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
  key: z.string().min(1),
  mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
  size: z.number().int().positive().max(12_000_000),
});

export function createGenerationRouter(
  flows: readonly GenerationFlow[],
  bindings: GenerationBinding & { YIR_API_KEY?: string; YIR_BASE_URL?: string },
) {
  return {
    flows: publicProcedure.handler(() =>
      flows.map(({ id, name, creditCost, minReferences, maxReferences }) => ({
        id,
        name,
        creditCost,
        minReferences: minReferences ?? 0,
        maxReferences: maxReferences ?? 5,
      })),
    ),
    balance: protectedProcedure.handler(({ context }) => creditBalance(context.session.user.id)),
    list: protectedProcedure.handler(({ context }) => listJobs(context.session.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .handler(async ({ input, context }) => {
        const job = await getJob(context.session.user.id, input.id);
        if (!job) throw new ORPCError("NOT_FOUND");
        return job;
      }),
    start: protectedProcedure
      .input(
        z.object({
          idempotencyKey: z.uuid(),
          flowId: z.string().min(1),
          prompt: z.string().trim().min(1).max(3000),
          references: z.array(reference).max(5),
          options: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .handler(async ({ input, context }) => {
        const flow = flows.find((item) => item.id === input.flowId);
        if (!flow) throw new ORPCError("BAD_REQUEST", { message: "Generation flow unavailable" });
        try {
          return await createJob(
            context.session.user.id,
            input.idempotencyKey,
            flow,
            {
              prompt: input.prompt,
              references: input.references,
              ...(input.options ? { options: input.options } : {}),
            },
            bindings,
          );
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Generation unavailable",
          });
        }
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .handler(async ({ input, context }) => {
        try {
          return await cancelJob(context.session.user.id, input.id, bindings);
        } catch (error) {
          throw new ORPCError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Cancellation failed",
          });
        }
      }),
  };
}
