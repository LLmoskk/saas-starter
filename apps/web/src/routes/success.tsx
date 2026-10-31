import { seoHead } from "@/utils/seo";
import { m } from "@/paraglide/messages";
import { Card, CardContent } from "@shadcn/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/success")({
  head: () => seoHead("/success", { title: m["payment.thanks"](), indexable: false }),
  component: () => (
    <main>
      <Card>
        <CardContent>
          <h1>{m["payment.thanks"]()}</h1>
          <p>{m["payment.confirmationPending"]()}</p>
          <Link to="/app">{m["payment.return"]()}</Link>
        </CardContent>
      </Card>
    </main>
  ),
});
