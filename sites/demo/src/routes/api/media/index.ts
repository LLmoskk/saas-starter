import { env } from "cloudflare:workers";
import { auth } from "@starter/auth";
import { createFileRoute } from "@tanstack/react-router";

const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);

export const Route = createFileRoute("/api/media/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) return new Response("Unauthorized", { status: 401 });
        const form = await request.formData();
        const file = form.get("file");
        if (
          !(file instanceof File) ||
          !allowed.has(file.type) ||
          file.size < 1 ||
          file.size > 12_000_000
        )
          return new Response("Invalid image", { status: 400 });
        const key = `users/${session.user.id}/${crypto.randomUUID()}`;
        await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
        return Response.json({ key, mime: file.type, size: file.size }, { status: 201 });
      },
    },
  },
});
