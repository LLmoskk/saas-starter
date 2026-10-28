import { seoHead } from "@/utils/seo";
import { Card } from "@starter/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
export const Route = createFileRoute("/")({
  head: () => seoHead("/", { title: m["home.title"]() }),
  component: () => (
    <Card as="main">
      <h1>{m["home.title"]()}</h1>
      <Link
        to="/app"
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground"
      >
        {m["generation.create"]()}
      </Link>
    </Card>
  ),
});
