import { createContext } from "@starter/api/context";
import { appRouter } from "@starter/api/routers/index";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
const rpc = new RPCHandler(appRouter);
async function handle({ request }: { request: Request }) {
  const result = await rpc.handle(request, {
    prefix: "/api/rpc",
    context: await createContext({ req: request }),
  });
  return result.response ?? new Response("Not found", { status: 404 });
}
export const Route = createFileRoute("/api/rpc/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
