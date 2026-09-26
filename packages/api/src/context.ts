import { auth } from "@starter/auth";
export async function createContext({ req }: { req: Request }) {
  return { session: await auth.api.getSession({ headers: req.headers }) };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
