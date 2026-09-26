import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/users")({ component: Users });
function Users() {
  const queryClient = useQueryClient();
  const users = useQuery(orpc.users.list.queryOptions());
  const change = useMutation(
    orpc.users.setDisabled.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.users.list.key() }),
    }),
  );
  if (users.isError) return <Link to="/login">Sign in</Link>;
  return (
    <main className="panel">
      <h1>Users</h1>
      <div className="table-wrap">
        <table>
          <tbody>
            {users.data?.map((row) => (
              <tr key={row.id}>
                <td>{row.email}</td>
                <td>{row.name}</td>
                <td>{row.disabledAt ? "Disabled" : "Active"}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => {
                      const reason = prompt("Reason for change");
                      if (reason) change.mutate({ id: row.id, disabled: !row.disabledAt, reason });
                    }}
                  >
                    {row.disabledAt ? "Restore" : "Disable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
