import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "@/utils/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          import.meta.env.MODE === "preview"
            ? "User-agent: *\nDisallow: /\n"
            : `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteUrl("/sitemap.xml", "en")}\n`,
          { headers: { "content-type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
