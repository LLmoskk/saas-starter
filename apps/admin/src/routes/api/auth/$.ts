import { createFileRoute } from "@tanstack/react-router";
import { adminAuth } from "@/server/auth";
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => adminAuth.handler(request),
      POST: ({ request }) => adminAuth.handler(request),
    },
  },
});
