import { Link, createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
export const Route = createFileRoute("/")({
  component: () => (
    <main className="panel">
      <h1>{m["home.title"]()}</h1>
      <p>{m["home.body"]()}</p>
      <Link to="/app">{m["nav.app"]()}</Link>
    </main>
  ),
});
