import { MetricCard, Page, PageHeader, Panel, Time } from "@starter/admin/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, ScrollText, Users } from "lucide-react";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/")({
  component: OverviewPage,
});

const AUTO_REFRESH_MS = 30_000;

const SHORTCUTS = [
  { to: "/users", label: "用户管理", description: "搜索、禁用与恢复账户", icon: Users },
  { to: "/payments", label: "支付记录", description: "查看订单与订阅状态", icon: CreditCard },
  { to: "/audit", label: "审计日志", description: "复核后台的每一次写操作", icon: ScrollText },
] as const;

function OverviewPage() {
  const query = useQuery(orpc.overview.get.queryOptions({ refetchInterval: AUTO_REFRESH_MS }));

  if (query.isPending) {
    return (
      <Page>
        <p className="text-sm text-muted-foreground">加载中…</p>
      </Page>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <Page>
        <p role="alert" className="text-sm text-destructive">
          总览加载失败，请稍后重试。
        </p>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="总览"
        description="核心指标每 30 秒自动刷新。"
        actions={
          <span className="text-[10px] text-muted-foreground">
            数据时间 <Time value={data.generatedAt} showIso={false} />
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="用户总数" value={data.users.total} />
        <MetricCard label="今日新增用户" value={data.users.newToday} />
        <MetricCard label="近 7 日新增" value={data.users.new7d} />
        <MetricCard label="近 30 日新增" value={data.users.new30d} />
      </div>

      <Panel>
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="admin-label">快捷入口</h2>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          {SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex min-h-24 items-start gap-3 bg-card p-4 no-underline transition-colors hover:bg-raised"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-raised text-muted-foreground group-hover:border-primary-line group-hover:text-primary">
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </Page>
  );
}
