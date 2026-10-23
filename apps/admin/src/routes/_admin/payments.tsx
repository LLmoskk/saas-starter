import {
  Page,
  PageHeader,
  Section,
  StatusChip,
  TableState,
  TableWrap,
  Time,
  type StatusTone,
} from "@starter/admin/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/payments")({
  component: PaymentsPage,
});

function statusTone(status: string): StatusTone {
  if (["paid", "active", "succeeded", "completed"].includes(status)) return "ok";
  if (["failed", "canceled", "expired", "refunded"].includes(status)) return "danger";
  if (["pending", "processing"].includes(status)) return "warning";
  return "neutral";
}

function PaymentsPage() {
  const payments = useQuery(orpc.payments.list.queryOptions());
  const subscriptions = useQuery(orpc.payments.subscriptions.queryOptions());

  return (
    <Page>
      <PageHeader title="支付" description="Waffo 订单与订阅的最近 100 条记录。" />

      <Section
        title="订单"
        contentClassName="!p-0"
        description={`${payments.data?.length ?? 0} 条`}
      >
        <TableWrap>
          <table className="admin-table min-w-[760px]">
            <thead>
              <tr>
                <th>订单号</th>
                <th>商品</th>
                <th>金额</th>
                <th>状态</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {payments.data?.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-52 truncate font-mono text-[11px]">{row.orderId}</td>
                  <td className="max-w-48 truncate text-muted-foreground">
                    {row.productName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap font-mono text-[11px]">
                    {row.amount ? `${row.amount} ${row.currency ?? ""}` : "—"}
                  </td>
                  <td>
                    <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip>
                  </td>
                  <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                    <Time value={row.updatedAt} />
                  </td>
                </tr>
              ))}
              {payments.data && payments.data.length === 0 ? (
                <TableState colSpan={5}>暂无订单</TableState>
              ) : null}
              {payments.isError && !payments.data ? (
                <TableState colSpan={5} tone="danger">
                  订单加载失败，请重试。
                </TableState>
              ) : null}
              {!payments.data && !payments.isError ? (
                <TableState colSpan={5}>加载中…</TableState>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </Section>

      <Section
        title="订阅"
        contentClassName="!p-0"
        description={`${subscriptions.data?.length ?? 0} 条`}
      >
        <TableWrap>
          <table className="admin-table min-w-[680px]">
            <thead>
              <tr>
                <th>订单号</th>
                <th>商品</th>
                <th>状态</th>
                <th>当前周期结束</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.data?.map((row) => (
                <tr key={row.orderId}>
                  <td className="max-w-52 truncate font-mono text-[11px]">{row.orderId}</td>
                  <td className="max-w-48 truncate text-muted-foreground">
                    {row.productName ?? "—"}
                  </td>
                  <td>
                    <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip>
                  </td>
                  <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                    <Time value={row.currentPeriodEnd} />
                  </td>
                </tr>
              ))}
              {subscriptions.data && subscriptions.data.length === 0 ? (
                <TableState colSpan={4}>暂无订阅</TableState>
              ) : null}
              {subscriptions.isError && !subscriptions.data ? (
                <TableState colSpan={4} tone="danger">
                  订阅加载失败，请重试。
                </TableState>
              ) : null}
              {!subscriptions.data && !subscriptions.isError ? (
                <TableState colSpan={4}>加载中…</TableState>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
      </Section>
    </Page>
  );
}
