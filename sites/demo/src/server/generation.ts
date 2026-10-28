import type { GenerationFlow } from "@starter/jobs";
import { env } from "@starter/env/server";

export const generationFlows: readonly GenerationFlow[] =
  env.YIR_VIDEO_MODEL && env.YIR_VIDEO_MAX_COST
    ? [
        {
          id: "image-video",
          name: "图片生成视频",
          creditCost: 1,
          minReferences: 1,
          maxReferences: 1,
          steps: [
            {
              id: "video",
              kind: "video",
              model: env.YIR_VIDEO_MODEL,
              maxCost: env.YIR_VIDEO_MAX_COST,
              build: ({ input, uploaded }) => ({
                type: "image",
                prompt: input.prompt,
                references: [{ role: "first_frame", file_id: uploaded[0]!.fileId }],
              }),
            },
          ],
        },
      ]
    : [];
