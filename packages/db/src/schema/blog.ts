import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
export const blogPost = sqliteTable(
  "blog_post",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    locale: text("locale").notNull().default("en"),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    markdown: text("markdown").notNull().default(""),
    status: text("status").notNull().default("draft"),
    coverUrl: text("cover_url"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("blog_post_locale_slug_idx").on(table.locale, table.slug)],
);
