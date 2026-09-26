import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/payments")({ component: Payments });
function Payments() {
  const payments = useQuery(orpc.payments.list.queryOptions());
  const subscriptions = useQuery(orpc.payments.subscriptions.queryOptions());
  if (payments.isError) return <Link to="/login">Sign in</Link>;
  return (
    <main>
      <section className="panel">
        <h1>Payments</h1>
        <div className="table-wrap">
          <table>
            <tbody>
              {payments.data?.map((row) => (
                <tr key={row.id}>
                  <td>{row.orderId}</td>
                  <td>{row.productName}</td>
                  <td>
                    {row.amount} {row.currency}
                  </td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Subscriptions</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              {subscriptions.data?.map((row) => (
                <tr key={row.orderId}>
                  <td>{row.orderId}</td>
                  <td>{row.productName}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
