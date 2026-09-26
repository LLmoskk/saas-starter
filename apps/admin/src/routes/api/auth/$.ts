import { createFileRoute } from "@tanstack/react-router";
import { adminAuth } from "@/server/auth";
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) =>
        process.env.VERCEL_ENV === "preview"
          ? new Response("Admin unavailable on preview", { status: 403 })
          : adminAuth.handler(request),
      POST: ({ request }) =>
        process.env.VERCEL_ENV === "preview"
          ? new Response("Admin unavailable on preview", { status: 403 })
          : adminAuth.handler(request),
    },
  },
});
