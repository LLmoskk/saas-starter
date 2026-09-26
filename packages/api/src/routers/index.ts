import type { RouterClient } from "@orpc/server";
import { db } from "@starter/db";
import { payment, subscription } from "@starter/db/schema/payment";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createCheckout, products } from "@starter/auth/payments";
import { protectedProcedure, publicProcedure } from "../index";
export const appRouter = {
  health: publicProcedure.handler(() => "OK"),
  me: protectedProcedure.handler(({ context }) => context.session.user),
  products: publicProcedure.handler(() => products),
  payments: protectedProcedure.handler(({ context }) =>
    db
      .select()
      .from(payment)
      .where(eq(payment.userId, context.session.user.id))
      .orderBy(desc(payment.paidAt)),
  ),
  subscriptions: protectedProcedure.handler(({ context }) =>
    db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, context.session.user.id))
      .orderBy(desc(subscription.updatedAt)),
  ),
  checkout: protectedProcedure
    .input(z.object({ productId: z.string().min(1) }))
    .handler(({ input, context }) =>
      createCheckout(context.session.user.id, context.session.user.email, input.productId),
    ),
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<AppRouter>;
