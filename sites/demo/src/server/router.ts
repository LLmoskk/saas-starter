import { env } from "cloudflare:workers";
import { baseRouter } from "@starter/api/routers/index";
import { createGenerationRouter } from "@starter/api/generation";
import type { GenerationBinding } from "@starter/jobs/server";
import { generationFlows } from "./generation";

export const appRouter = {
  ...baseRouter,
  generation: createGenerationRouter(
    generationFlows,
    env as unknown as GenerationBinding & { YIR_API_KEY?: string; YIR_BASE_URL?: string },
  ),
};
