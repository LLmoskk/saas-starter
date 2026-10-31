import { seoHead } from "@/utils/seo";
import { Card, CardContent } from "@shadcn/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
export const Route = createFileRoute("/")({
  head: () => seoHead("/", { title: m["home.title"]() }),
  component: () => (
    <main>
      <Card>
        <CardContent>
          <h1>{m["home.title"]()}</h1>
          <p>{m["home.body"]()}</p>
          <Link to="/app">{m["nav.app"]()}</Link>
        </CardContent>
      </Card>
    </main>
  ),
});
