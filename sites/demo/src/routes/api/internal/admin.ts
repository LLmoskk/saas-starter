import {
  getOverview,
  getUserDetail,
  listAuditEvents,
  listUsers,
  setUserDisabled,
} from "@starter/admin/server";
import { auditLogSearchSchema, usersSearchSchema } from "@starter/admin/search";
import { db } from "@starter/db";
import { adminAuditEvent } from "@starter/db/schema/admin";
import { blogPost } from "@starter/db/schema/blog";
import { creditEntry, generationJob } from "@starter/db/schema/generation";
import { payment, subscription } from "@starter/db/schema/payment";
import { env, services } from "@starter/env/server";
import { createBlogImageUpload } from "@starter/storage";
import { desc, eq } from "drizzle-orm";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const requestSchema = z.object({
  action: z.string(),
  input: z.unknown().optional(),
  actor: z.email(),
});
const postSchema = z.object({
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

function authorized(request: Request): boolean {
  const expected = env.SITE_ADMIN_TOKEN;
  const actual = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (!expected || actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++)
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

async function dispatch(action: string, rawInput: unknown, actor: string) {
  switch (action) {
    case "overview.get":
      return getOverview();
    case "users.list":
      return listUsers(usersSearchSchema.parse(rawInput ?? {}));
    case "users.detail":
      return getUserDetail(z.object({ userId: z.string().min(1) }).parse(rawInput).userId);
    case "users.setDisabled": {
      const input = z
        .object({
          userId: z.string().min(1),
          disabled: z.boolean(),
          reason: z.string().max(500).optional(),
          idempotencyKey: z.uuid(),
        })
        .parse(rawInput);
      return setUserDisabled({ ...input, actorUserId: actor, requestIp: null });
    }
    case "audit.list":
      return listAuditEvents(auditLogSearchSchema.parse(rawInput ?? {}));
    case "payments.list":
      return db.select().from(payment).orderBy(desc(payment.updatedAt)).limit(100);
    case "payments.subscriptions":
      return db.select().from(subscription).orderBy(desc(subscription.updatedAt)).limit(100);
    case "blog.list":
      return db.select().from(blogPost).orderBy(desc(blogPost.updatedAt)).limit(100);
    case "blog.save": {
      const input = postSchema.parse(rawInput);
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
      const change = input.id
        ? db.update(blogPost).set(values).where(eq(blogPost.id, id))
        : db.insert(blogPost).values({ id, ...values, authorId: null });
      await db.batch([
        change,
        db.insert(adminAuditEvent).values({
          id: crypto.randomUUID(),
          actorUserId: actor,
          action: input.status === "published" ? "blog_publish" : "blog_save",
          targetType: "blog_post",
          targetId: id,
        }),
      ]);
      return { id };
    }
    case "blog.uploadUrl": {
      const input = z
        .object({ contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]) })
        .parse(rawInput);
      return createBlogImageUpload(input.contentType);
    }
    case "jobs.list":
      return db.select().from(generationJob).orderBy(desc(generationJob.createdAt)).limit(100);
    case "credits.grant": {
      const input = z
        .object({
          userId: z.string().min(1),
          amount: z
            .number()
            .int()
            .min(-10000)
            .max(10000)
            .refine((value) => value !== 0),
          reason: z.string().min(1).max(500),
          idempotencyKey: z.uuid(),
        })
        .parse(rawInput);
      await db.batch([
        db
          .insert(creditEntry)
          .values({
            id: `admin:${input.idempotencyKey}`,
            userId: input.userId,
            amount: input.amount,
            reason: "admin_adjustment",
            referenceId: input.idempotencyKey,
          })
          .onConflictDoNothing(),
        db
          .insert(adminAuditEvent)
          .values({
            id: `credits:${input.idempotencyKey}`,
            actorUserId: actor,
            action: "credits_adjust",
            targetType: "user",
            targetId: input.userId,
            reason: input.reason,
            after: { amount: input.amount },
            idempotencyKey: input.idempotencyKey,
          })
          .onConflictDoNothing(),
      ]);
      return { userId: input.userId, amount: input.amount };
    }
    case "features":
      return { storage: Boolean(services.storage) };
    default:
      throw new Error("Unknown admin action");
  }
}

export const Route = createFileRoute("/api/internal/admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const body = requestSchema.parse(await request.json());
          return Response.json(await dispatch(body.action, body.input, body.actor));
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Bad request" },
            { status: 400 },
          );
        }
      },
    },
  },
});
