import { db } from "@starter/db";
import { user, session } from "@starter/db/schema/auth";
import { adminAuditEvent } from "@starter/db/schema/admin";
import { payment, subscription } from "@starter/db/schema/payment";
import { blogPost } from "@starter/db/schema/blog";
import { createBlogImageUpload } from "@starter/storage";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure } from "./orpc";
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
export const adminRouter = {
  me: adminProcedure.handler(({ context }) => ({ email: context.admin.email })),
  users: {
    list: adminProcedure.handler(() =>
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          disabledAt: user.disabledAt,
          createdAt: user.createdAt,
        })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(100),
    ),
    setDisabled: adminProcedure
      .input(z.object({ id: z.string(), disabled: z.boolean(), reason: z.string().trim().min(1) }))
      .handler(async ({ input, context }) =>
        db.transaction(async (tx) => {
          const [before] = await tx
            .select({ disabledAt: user.disabledAt })
            .from(user)
            .where(eq(user.id, input.id))
            .limit(1);
          if (!before) throw new Error("User not found");
          const disabledAt = input.disabled ? new Date() : null;
          await tx.update(user).set({ disabledAt }).where(eq(user.id, input.id));
          if (input.disabled) await tx.delete(session).where(eq(session.userId, input.id));
          await tx
            .insert(adminAuditEvent)
            .values({
              id: crypto.randomUUID(),
              actorUserId: context.admin.id,
              action: input.disabled ? "user_disable" : "user_restore",
              targetType: "user",
              targetId: input.id,
              reason: input.reason,
              before,
              after: { disabledAt },
            });
          return { ok: true };
        }),
      ),
  },
  payments: {
    list: adminProcedure.handler(() =>
      db.select().from(payment).orderBy(desc(payment.updatedAt)).limit(100),
    ),
    subscriptions: adminProcedure.handler(() =>
      db.select().from(subscription).orderBy(desc(subscription.updatedAt)).limit(100),
    ),
  },
  audit: {
    list: adminProcedure.handler(() =>
      db.select().from(adminAuditEvent).orderBy(desc(adminAuditEvent.createdAt)).limit(100),
    ),
  },
  blog: {
    list: adminProcedure.handler(() =>
      db.select().from(blogPost).orderBy(desc(blogPost.updatedAt)).limit(100),
    ),
    save: adminProcedure.input(postInput).handler(async ({ input, context }) =>
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
        await tx
          .insert(adminAuditEvent)
          .values({
            id: crypto.randomUUID(),
            actorUserId: context.admin.id,
            action: input.status === "published" ? "blog_publish" : "blog_save",
            targetType: "blog_post",
            targetId: id,
          });
        return { id };
      }),
    ),
    uploadUrl: adminProcedure
      .input(
        z.object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]) }),
      )
      .handler(({ input }) => createBlogImageUpload(input.contentType)),
  },
};
export type AdminRouter = typeof adminRouter;
