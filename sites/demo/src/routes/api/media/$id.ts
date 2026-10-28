import { env } from "cloudflare:workers";
import { auth } from "@starter/auth";
import { getJob } from "@starter/jobs/server";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/media/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) return new Response("Unauthorized", { status: 401 });
        const job = await getJob(session.user.id, params.id);
        if (!job || job.status !== "succeeded" || !job.outputKey)
          return new Response("Not found", { status: 404 });
        const object = await env.MEDIA.get(job.outputKey);
        if (!object) return new Response("Not found", { status: 404 });
        const download = new URL(request.url).searchParams.has("download");
        return new Response(object.body, {
          headers: {
            "Content-Type": job.outputMime ?? "application/octet-stream",
            "Cache-Control": "private, no-store",
            ...(download
              ? {
                  "Content-Disposition": `attachment; filename="${job.id}.${job.outputMime === "video/webm" ? "webm" : "mp4"}"`,
                }
              : {}),
          },
        });
      },
    },
  },
});
