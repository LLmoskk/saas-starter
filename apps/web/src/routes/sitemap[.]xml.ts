import { db } from "@starter/db";
import { blogPost } from "@starter/db/schema/blog";
import { eq } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { locales, type Locale } from "@/paraglide/runtime";
import { siteUrl } from "@/utils/seo";

function escape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}
function entry(path: string, locale: Locale, available: readonly string[], updatedAt?: Date) {
  const alternates = locales.filter((candidate) => available.includes(candidate));
  const links = alternates.map(
    (candidate) =>
      `<xhtml:link rel="alternate" hreflang="${candidate}" href="${escape(siteUrl(path, candidate))}"/>`,
  );
  if (alternates.includes("en"))
    links.push(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${escape(siteUrl(path, "en"))}"/>`,
    );
  return `<url><loc>${escape(siteUrl(path, locale))}</loc>${updatedAt ? `<lastmod>${updatedAt.toISOString()}</lastmod>` : ""}${links.join("")}</url>`;
}
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        if (import.meta.env.MODE === "preview") return new Response("Not found", { status: 404 });
        const posts = await db
          .select({ slug: blogPost.slug, locale: blogPost.locale, updatedAt: blogPost.updatedAt })
          .from(blogPost)
          .where(eq(blogPost.status, "published"));
        const entries = ["/", "/blog"].flatMap((path) =>
          locales.map((locale) => entry(path, locale, locales)),
        );
        const translations = new Map<string, string[]>();
        for (const post of posts) {
          const available = translations.get(post.slug) ?? [];
          available.push(post.locale);
          translations.set(post.slug, available);
        }
        for (const post of posts) {
          if (!locales.some((locale) => locale === post.locale)) continue;
          entries.push(
            entry(
              `/blog/${encodeURIComponent(post.slug)}`,
              post.locale as Locale,
              translations.get(post.slug) ?? [],
              post.updatedAt,
            ),
          );
        }
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join("")}</urlset>`,
          { headers: { "content-type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
