import { seoHead } from "@/utils/seo";
import { m } from "@/paraglide/messages";
import { Card } from "@starter/ui";
import { Link, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/success")({
  head: () => seoHead("/success", { title: m["payment.thanks"](), indexable: false }),
  component: () => (
    <Card as="main">
      <h1>{m["payment.thanks"]()}</h1>
      <p>{m["payment.confirmationPending"]()}</p>
      <Link to="/app">{m["payment.return"]()}</Link>
    </Card>
  ),
});
