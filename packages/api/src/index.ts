import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";
export const o = os.$context<Context>();
export const publicProcedure = o;
export const protectedProcedure = o.use(({ context, next }) => {
  if (!context.session?.user) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { session: context.session } });
});
