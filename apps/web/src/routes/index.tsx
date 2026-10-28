import { seoHead } from "@/utils/seo";
import { Card } from "@starter/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
export const Route = createFileRoute("/")({
  head: () => seoHead("/", { title: m["home.title"]() }),
  component: () => (
    <Card as="main">
      <h1>{m["home.title"]()}</h1>
      <p>{m["home.body"]()}</p>
      <Link to="/app">{m["nav.app"]()}</Link>
    </Card>
  ),
});
