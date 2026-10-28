import { services } from "@starter/env/server";
import { createAdminRouter, recordAdminAudit } from "@starter/admin/server";
import { db } from "@starter/db";
import { blogPost } from "@starter/db/schema/blog";
import { payment, subscription } from "@starter/db/schema/payment";
import { createBlogImageUpload } from "@starter/storage";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

// 保证服务端在第一次执行 procedure 前已经注入品牌/时区配置。
import "@/admin-config";

import { adminAuth } from "./auth";

const core = createAdminRouter({ auth: adminAuth });

export const createContext = core.createContext;

const postInput = z.object({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  locale: z.enum(["en", "zh-CN"]),
  title: z.string().min(1),
  excerpt: z.string(),
  markdown: z.string(),
  coverUrl: z.url().optional().or(z.literal("")),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

/**
 * 通用内核 + 本项目自己的业务模块。通用部分来自 @starter/admin/server，
 * 业务 procedure 复用同一个 adminProcedure，保证鉴权与审计口径一致。
 */
export const adminRouter = {
  ...core.router,
  features: core.publicProcedure.handler(() => ({
    google: Boolean(services.google),
    storage: Boolean(services.storage),
  })),
  payments: {
    list: core.adminProcedure.handler(() =>
      db.select().from(payment).orderBy(desc(payment.updatedAt)).limit(100),
    ),
    subscriptions: core.adminProcedure.handler(() =>
      db.select().from(subscription).orderBy(desc(subscription.updatedAt)).limit(100),
    ),
  },
  blog: {
    list: core.adminProcedure.handler(() =>
      db.select().from(blogPost).orderBy(desc(blogPost.updatedAt)).limit(100),
    ),
    save: core.adminProcedure.input(postInput).handler(async ({ input, context }) =>
      db.transaction(async (tx) => {
        const id = input.id ?? crypto.randomUUID();
        const values = {
          slug: input.slug,
          locale: input.locale,
          title: input.title,
          excerpt: input.excerpt,
          markdown: input.markdown,
          coverUrl: input.coverUrl || null,
          seoTitle: input.seoTitle || null,
          seoDescription: input.seoDescription || null,
          status: input.status,
          publishedAt: input.status === "published" ? new Date() : null,
          updatedAt: new Date(),
        };
        if (input.id) {
          await tx.update(blogPost).set(values).where(eq(blogPost.id, id));
        } else {
          await tx.insert(blogPost).values({ id, ...values, authorId: context.admin.id });
        }
        await recordAdminAudit(tx, {
          actorUserId: context.admin.id,
          action: input.status === "published" ? "blog_publish" : "blog_save",
          targetType: "blog_post",
          targetId: id,
        });
        return { id };
      }),
    ),
    uploadUrl: core.adminProcedure
      .input(
        z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]) }),
      )
      .handler(({ input }) => createBlogImageUpload(input.contentType)),
  },
};

export type AdminRouter = typeof adminRouter;
