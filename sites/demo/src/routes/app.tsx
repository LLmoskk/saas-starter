import { seoHead } from "@/utils/seo";
import { Card, Button, Dialog } from "@starter/ui";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { m } from "@/paraglide/messages";
import { GenerationStudio } from "@/components/generation-studio";
import {
  OPEN_SUBSCRIPTION_STATUSES,
  WAFFO_CONSUMER_PORTAL_URL,
} from "@starter/auth/payment-contract";
export const Route = createFileRoute("/app")({
  head: () => seoHead("/app", { title: m["app.title"](), indexable: false }),
  component: App,
});
function App() {
  const features = useQuery(orpc.features.queryOptions());
  const me = useQuery(orpc.me.queryOptions());
  const products = useQuery(
    orpc.products.queryOptions({ enabled: features.data?.payments === true }),
  );
  const payments = useQuery(
    orpc.payments.queryOptions({ enabled: features.data?.payments === true }),
  );
  const subscriptions = useQuery(
    orpc.subscriptions.queryOptions({ enabled: features.data?.payments === true }),
  );
  const checkout = useMutation(orpc.checkout.mutationOptions());
  const openSubscriptions =
    subscriptions.data?.filter((item) =>
      OPEN_SUBSCRIPTION_STATUSES.some((status) => status === item.status),
    ) ?? [];
  if (me.isError)
    return (
      <Card as="main">
        <Link to="/login">{m["auth.signin"]()}</Link>
      </Card>
    );
  return (
    <main className="grid gap-6">
      <Card>
        <h1>{m["app.title"]()}</h1>
        <p>{me.data?.email}</p>
      </Card>
      <GenerationStudio />
      {features.data?.payments ? (
        <>
          <Card>
            <h2>{m["app.products"]()}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.data?.map((product) => {
                const current =
                  product.type === "subscription" &&
                  openSubscriptions.some((item) => item.productId === product.id);
                return (
                  <Card as="div" key={product.id}>
                    <h3>{product.name}</h3>
                    <Button
                      disabled={
                        current ||
                        checkout.isPending ||
                        (product.type === "subscription" && subscriptions.isPending)
                      }
                      onClick={() => checkout.mutate({ productId: product.id })}
                    >
                      {current
                        ? m["app.currentPlan"]()
                        : product.type === "subscription" && openSubscriptions.length
                          ? m["app.changePlan"]()
                          : m["app.checkout"]()}
                    </Button>
                  </Card>
                );
              })}
            </div>
            {checkout.error ? <p role="alert">{checkout.error.message}</p> : null}
            <Dialog
              open={Boolean(checkout.data && !checkout.isPending)}
              title={
                checkout.data?.kind === "plan-change"
                  ? m["app.planChangeReady"]()
                  : checkout.data?.kind === "portal"
                    ? m["app.manageSubscription"]()
                    : m["app.checkoutReady"]()
              }
              closeLabel={m["app.cancel"]()}
              onClose={() => checkout.reset()}
            >
              <div className="flex flex-wrap gap-3">
                {checkout.data ? (
                  <a
                    className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground"
                    href={checkout.data.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => checkout.reset()}
                  >
                    {m["app.continue"]()}
                  </a>
                ) : null}
                <Button variant="outline" onClick={() => checkout.reset()}>
                  {m["app.cancel"]()}
                </Button>
              </div>
            </Dialog>
          </Card>
          <Card>
            <h2>{m["app.subscriptions"]()}</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {subscriptions.data?.map((item) => (
                    <tr key={item.orderId}>
                      <td>{item.productName}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <a href={WAFFO_CONSUMER_PORTAL_URL} target="_blank" rel="noopener noreferrer">
                {m["app.manageSubscription"]()}
              </a>
            </p>
          </Card>
          <Card>
            <h2>{m["app.payments"]()}</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {payments.data?.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.amount} {item.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </main>
  );
}
