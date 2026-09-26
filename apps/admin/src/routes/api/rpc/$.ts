import { createFileRoute } from "@tanstack/react-router";
import { RPCHandler } from "@orpc/server/fetch";
import { createContext } from "@/server/orpc";
import { adminRouter } from "@/server/router";
const rpc = new RPCHandler(adminRouter);
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
