import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { m } from "@/paraglide/messages";
export const Route = createFileRoute("/app")({ component: App });
function App() {
  const me = useQuery(orpc.me.queryOptions());
  const products = useQuery(orpc.products.queryOptions());
  const payments = useQuery(orpc.payments.queryOptions());
  const subscriptions = useQuery(orpc.subscriptions.queryOptions());
  const checkout = useMutation(orpc.checkout.mutationOptions());
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
          {products.data?.map((product) => (
            <div className="panel" key={product.id}>
              <h3>{product.name}</h3>
              <button
                className="button"
                disabled={checkout.isPending}
                onClick={async () => {
                  const result = await checkout.mutateAsync({ productId: product.id });
                  location.href = result.checkoutUrl;
                }}
              >
                {m["app.checkout"]()}
              </button>
            </div>
          ))}
        </div>
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
          <a href="https://pancake.waffo.ai/consumer/portal/login">
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
