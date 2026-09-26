import { ORPCError, os } from "@orpc/server";
import { adminAuth, isAdminEmail } from "./auth";
export async function createContext({ req }: { req: Request }) {
  if (process.env.VERCEL_ENV === "preview") return { session: null };
  return { session: await adminAuth.api.getSession({ headers: req.headers }) };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
const o = os.$context<Context>();
export const adminProcedure = o.use(({ context, next }) => {
  const user = context.session?.user;
  if (!user) throw new ORPCError("UNAUTHORIZED");
  if (!isAdminEmail(user.email)) throw new ORPCError("FORBIDDEN");
  return next({ context: { session: context.session, admin: user } });
});
