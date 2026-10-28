import { locales } from "@/paraglide/runtime";
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
  .validator(z.object({ slug: z.string(), locale: z.enum(locales) }))
  .handler(async ({ data }) => {
    const posts = await db
      .select()
      .from(blogPost)
      .where(and(eq(blogPost.slug, data.slug), eq(blogPost.status, "published")));
    const post = posts.find((post) => post.locale === data.locale);
    return post ? { ...post, availableLocales: posts.map((post) => post.locale) } : null;
  });
