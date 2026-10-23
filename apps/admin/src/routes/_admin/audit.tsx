import { nextPageAfterSearchPatch } from "@starter/admin/pagination";
import { auditLogSearchSchema } from "@starter/admin/search";
import type { AuditEventListItem } from "@starter/admin/server";
import { ListPager, Page, PageHeader, Panel, TableState, TableWrap, Time } from "@starter/admin/ui";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";

import { adminConfig } from "@/admin-config";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/audit")({
  validateSearch: auditLogSearchSchema,
  component: AuditLogPage,
});

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div className="min-w-0">
      <p className="admin-label mb-1">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-sm border border-border bg-background p-2 font-mono text-[10px] break-all whitespace-pre-wrap text-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function AuditEventDetail({ event }: { event: AuditEventListItem }) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-border bg-raised/50 p-4">
      <div className="flex flex-col gap-1 text-xs">
        <p>
          <span className="admin-label mr-2">事件 ID</span>
          <span className="font-mono text-[11px] break-all">{event.id}</span>
        </p>
        <p>
          <span className="admin-label mr-2">目标</span>
          <span className="font-mono text-[11px] break-all">
            {event.targetType}:{event.targetId}
          </span>
        </p>
        <p>
          <span className="admin-label mr-2">请求 IP</span>
          <span className="font-mono text-[11px]">{event.requestIp ?? "—"}</span>
        </p>
        <p>
          <span className="admin-label mr-2">原因</span>
          <span className="break-all text-foreground">{event.reason ?? "—"}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <JsonBlock label="变更前" value={event.before} />
        <JsonBlock label="变更后" value={event.after} />
      </div>
    </div>
  );
}

function useAuditQuery() {
  const search = Route.useSearch();
  return useQuery(
    orpc.audit.list.queryOptions({
      input: { page: search.page, pageSize: search.pageSize },
      placeholderData: keepPreviousData,
    }),
  );
}

function AuditLogPage() {
  const navigate = Route.useNavigate();
  const query = useAuditQuery();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Page>
      <PageHeader
        title="审计日志"
        description="敏感元数据访问与后台写操作的不可变记录；仅可查阅，不可修改或删除。"
      />

      <Panel>
        <TableWrap>
          <table className="admin-table min-w-[820px]">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作者</th>
                <th>动作</th>
                <th>目标</th>
                <th>原因</th>
                <th className="text-right">详情</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((event) => (
                <Fragment key={event.id}>
                  <tr>
                    <td className="whitespace-nowrap text-[10px] text-muted-foreground">
                      <Time value={event.createdAt} />
                    </td>
                    <td className="max-w-44 truncate">{event.actorEmail}</td>
                    <td>
                      <span className="font-mono text-[11px]">
                        {adminConfig.auditActions[event.action] ?? event.action}
                      </span>
                    </td>
                    <td
                      className="max-w-36 truncate font-mono text-[10px] text-muted-foreground"
                      title={`${event.targetType}:${event.targetId}`}
                    >
                      {event.targetType}:{event.targetId.slice(0, 8)}…
                    </td>
                    <td className="max-w-56 truncate text-muted-foreground">
                      {event.reason ?? "—"}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                        className="admin-link"
                      >
                        {expandedId === event.id ? "收起" : "详情"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === event.id ? (
                    <tr>
                      <td colSpan={6} className="!p-0">
                        <AuditEventDetail event={event} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {query.data && query.data.items.length === 0 ? (
                <TableState colSpan={6}>暂无审计事件</TableState>
              ) : null}
              {query.isError && !query.data ? (
                <TableState colSpan={6} tone="danger">
                  审计日志加载失败，请重试。
                </TableState>
              ) : null}
              {!query.data && !query.isError ? <TableState colSpan={6}>加载中…</TableState> : null}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {query.data ? (
        <ListPager
          total={query.data.total}
          page={query.data.page}
          pageSize={query.data.pageSize}
          disabled={query.isPlaceholderData}
          onPageChange={(page) => void navigate({ search: (prev) => ({ ...prev, page }) })}
          onPageSizeChange={(pageSize) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                pageSize,
                page: nextPageAfterSearchPatch({ pageSize }, prev.page ?? 1),
              }),
            })
          }
        />
      ) : null}
    </Page>
  );
}
