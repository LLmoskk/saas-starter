import {
  Field,
  Page,
  PageHeader,
  Section,
  StatusChip,
  TableState,
  TableWrap,
  Time,
} from "@starter/admin/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const query = useQuery(orpc.users.detail.queryOptions({ input: { userId } }));

  return (
    <Page>
      <PageHeader
        title="用户详情"
        description={query.data?.user.email}
        actions={
          <Link to="/users" className="admin-link">
            返回列表
          </Link>
        }
      />

      {query.isError && !query.data ? (
        <p role="alert" className="text-sm text-destructive">
          用户详情加载失败，请返回列表重试。
        </p>
      ) : null}
      {!query.data && !query.isError ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : null}

      {query.data ? (
        <>
          <Section title="账户信息">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="用户 ID">
                <span className="font-mono">{query.data.user.id}</span>
              </Field>
              <Field label="邮箱">{query.data.user.email}</Field>
              <Field label="名称">{query.data.user.name || "—"}</Field>
              <Field label="注册时间">
                <Time value={query.data.user.createdAt} />
              </Field>
              <Field label="邮箱验证">{query.data.user.emailVerified ? "已验证" : "未验证"}</Field>
              <Field label="状态">
                <StatusChip tone={query.data.user.disabled ? "danger" : "ok"}>
                  {query.data.user.disabled ? "已禁用" : "正常"}
                </StatusChip>
              </Field>
            </div>
          </Section>

          <Section
            title="活跃会话"
            description={`${query.data.sessions.length} 个`}
            contentClassName="!p-0"
          >
            <TableWrap>
              <table className="admin-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>创建时间</th>
                    <th>过期时间</th>
                    <th>IP</th>
                    <th>设备</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.sessions.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                        <Time value={row.createdAt} />
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                        <Time value={row.expiresAt} />
                      </td>
                      <td className="whitespace-nowrap font-mono text-[11px]">
                        {row.ipAddress ?? "—"}
                      </td>
                      <td className="max-w-80 truncate text-[11px] text-muted-foreground">
                        <span title={row.userAgent ?? undefined}>{row.userAgent ?? "—"}</span>
                      </td>
                    </tr>
                  ))}
                  {query.data.sessions.length === 0 ? (
                    <TableState colSpan={4}>当前没有活跃会话</TableState>
                  ) : null}
                </tbody>
              </table>
            </TableWrap>
          </Section>
        </>
      ) : null}
    </Page>
  );
}
