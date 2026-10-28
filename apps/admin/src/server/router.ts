import {
  createAdminRouter,
  type getOverview,
  type getUserDetail,
  type listAuditEvents,
  type listUsers,
  type setUserDisabled,
} from "@starter/admin/server";
import { auditLogSearchSchema, usersSearchSchema } from "@starter/admin/search";
import type { blogPost } from "@starter/db/schema/blog";
import type { generationJob } from "@starter/db/schema/generation";
import type { payment, subscription } from "@starter/db/schema/payment";
import { services } from "@starter/env/server";
import type { createBlogImageUpload } from "@starter/storage";
import { z } from "zod";
import "@/admin-config";
import { siteRegistry } from "@/sites";
import { adminAuth } from "./auth";
import { selectedSite, siteRequest } from "./site-client";

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

export const adminRouter = {
  ...core.router,
  sites: core.adminProcedure.handler(({ context }) => ({
    items: siteRegistry.map(({ id, name }) => ({ id, name })),
    selected: selectedSite(context.siteId).id,
  })),
  features: core.publicProcedure.handler(async ({ context }) => ({
    google: Boolean(services.google),
    storage: (
      await siteRequest<{ storage: boolean }>(context, "features").catch(() => ({ storage: false }))
    ).storage,
  })),
  overview: {
    get: core.adminProcedure.handler(({ context }) =>
      siteRequest<Awaited<ReturnType<typeof getOverview>>>(context, "overview.get"),
    ),
  },
  users: {
    list: core.adminProcedure
      .input(usersSearchSchema)
      .handler(({ input, context }) =>
        siteRequest<Awaited<ReturnType<typeof listUsers>>>(context, "users.list", input),
      ),
    detail: core.adminProcedure
      .input(z.object({ userId: z.string().min(1) }))
      .handler(({ input, context }) =>
        siteRequest<Awaited<ReturnType<typeof getUserDetail>>>(context, "users.detail", input),
      ),
    setDisabled: core.desktopWriteProcedure
      .input(
        z.object({
          userId: z.string().min(1),
          disabled: z.boolean(),
          reason: z.string().trim().max(500).optional(),
          idempotencyKey: z.uuid(),
        }),
      )
      .handler(({ input, context }) =>
        siteRequest<Awaited<ReturnType<typeof setUserDisabled>>>(
          context,
          "users.setDisabled",
          input,
        ),
      ),
  },
  audit: {
    list: core.adminProcedure
      .input(auditLogSearchSchema)
      .handler(({ input, context }) =>
        siteRequest<Awaited<ReturnType<typeof listAuditEvents>>>(context, "audit.list", input),
      ),
  },
  payments: {
    list: core.adminProcedure.handler(({ context }) =>
      siteRequest<(typeof payment.$inferSelect)[]>(context, "payments.list"),
    ),
    subscriptions: core.adminProcedure.handler(({ context }) =>
      siteRequest<(typeof subscription.$inferSelect)[]>(context, "payments.subscriptions"),
    ),
  },
  blog: {
    list: core.adminProcedure.handler(({ context }) =>
      siteRequest<(typeof blogPost.$inferSelect)[]>(context, "blog.list"),
    ),
    save: core.desktopWriteProcedure
      .input(postInput)
      .handler(({ input, context }) => siteRequest<{ id: string }>(context, "blog.save", input)),
    uploadUrl: core.adminProcedure
      .input(
        z.object({
          contentType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]),
        }),
      )
      .handler(({ input, context }) =>
        siteRequest<Awaited<ReturnType<typeof createBlogImageUpload>>>(
          context,
          "blog.uploadUrl",
          input,
        ),
      ),
  },
  jobs: {
    list: core.adminProcedure.handler(({ context }) =>
      siteRequest<(typeof generationJob.$inferSelect)[]>(context, "jobs.list"),
    ),
  },
  credits: {
    grant: core.desktopWriteProcedure
      .input(
        z.object({
          userId: z.string().min(1),
          amount: z
            .number()
            .int()
            .min(-10000)
            .max(10000)
            .refine((value) => value !== 0),
          reason: z.string().min(1).max(500),
          idempotencyKey: z.uuid(),
        }),
      )
      .handler(({ input, context }) =>
        siteRequest<{ userId: string; amount: number }>(context, "credits.grant", input),
      ),
  },
};

export type AdminRouter = typeof adminRouter;
