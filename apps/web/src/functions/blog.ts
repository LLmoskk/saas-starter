import { createServerFn } from "@tanstack/react-start";
import { db } from "@starter/db";
import { blogPost } from "@starter/db/schema/blog";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
export const listBlogPosts = createServerFn({ method: "GET" }).handler(() =>
  db
    .select({
      id: blogPost.id,
      slug: blogPost.slug,
      locale: blogPost.locale,
      title: blogPost.title,
      excerpt: blogPost.excerpt,
      publishedAt: blogPost.publishedAt,
    })
    .from(blogPost)
    .where(eq(blogPost.status, "published"))
    .orderBy(desc(blogPost.publishedAt)),
);
export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string(), locale: z.enum(["en", "zh-CN"]) }))
  .handler(async ({ data }) => {
    const [post] = await db
      .select()
      .from(blogPost)
      .where(
        and(
          eq(blogPost.slug, data.slug),
          eq(blogPost.locale, data.locale),
          eq(blogPost.status, "published"),
        ),
      )
      .limit(1);
    return post ?? null;
  });
