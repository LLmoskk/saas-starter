import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { m } from "@/paraglide/messages";
import {
  OPEN_SUBSCRIPTION_STATUSES,
  WAFFO_CONSUMER_PORTAL_URL,
} from "@starter/auth/payment-contract";
export const Route = createFileRoute("/app")({ component: App });
function App() {
  const me = useQuery(orpc.me.queryOptions());
  const products = useQuery(orpc.products.queryOptions());
  const payments = useQuery(orpc.payments.queryOptions());
  const subscriptions = useQuery(orpc.subscriptions.queryOptions());
  const checkout = useMutation(orpc.checkout.mutationOptions());
  const openSubscriptions =
    subscriptions.data?.filter((item) =>
      OPEN_SUBSCRIPTION_STATUSES.some((status) => status === item.status),
    ) ?? [];
  if (me.isError)
    return (
      <main className="panel">
        <a href="/login">Sign in</a>
      </main>
    );
  return (
    <main>
      <section className="panel">
        <h1>{m["app.title"]()}</h1>
        <p>{m["app.body"]()}</p>
        <p>{me.data?.email}</p>
      </section>
      <section className="panel">
        <h2>{m["app.products"]()}</h2>
        <div className="grid">
          {products.data?.map((product) => {
            const current =
              product.type === "subscription" &&
              openSubscriptions.some((item) => item.productId === product.id);
            return (
              <div className="panel" key={product.id}>
                <h3>{product.name}</h3>
                <button
                  className="button"
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
                </button>
              </div>
            );
          })}
        </div>
        {checkout.error ? <p role="alert">{checkout.error.message}</p> : null}
        {checkout.data && !checkout.isPending ? (
          <section className="panel" aria-live="polite">
            <h3>
              {checkout.data.kind === "plan-change"
                ? m["app.planChangeReady"]()
                : checkout.data.kind === "portal"
                  ? m["app.manageSubscription"]()
                  : m["app.checkoutReady"]()}
            </h3>
            <p>
              {checkout.data.kind === "plan-change"
                ? m["app.planChangeDescription"]()
                : checkout.data.kind === "portal"
                  ? m["app.portalDescription"]()
                  : m["app.checkoutDescription"]()}
            </p>
            <a
              className="button"
              href={checkout.data.checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => checkout.reset()}
            >
              {m["app.continue"]()}
            </a>
            <button className="button" onClick={() => checkout.reset()}>
              {m["app.cancel"]()}
            </button>
          </section>
        ) : null}
      </section>
      <section className="panel">
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
      </section>
      <section className="panel">
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
      </section>
    </main>
  );
}
