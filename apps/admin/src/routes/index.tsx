import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/")({
  component: () => {
    const me = useQuery(orpc.me.queryOptions());
    return (
      <main className="panel">
        <h1>Operations</h1>
        {me.isError ? <Link to="/login">Sign in</Link> : <p>{me.data?.email}</p>}
      </main>
    );
  },
});
