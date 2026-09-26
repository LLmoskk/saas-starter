import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/audit")({ component: Audit });
function Audit() {
  const audit = useQuery(orpc.audit.list.queryOptions());
  if (audit.isError) return <Link to="/login">Sign in</Link>;
  return (
    <main className="panel">
      <h1>Audit log</h1>
      <div className="table-wrap">
        <table>
          <tbody>
            {audit.data?.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt?.toString()}</td>
                <td>{row.action}</td>
                <td>
                  {row.targetType}:{row.targetId}
                </td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
