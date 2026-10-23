import { nextPageAfterSearchPatch } from "@starter/admin/pagination";
import { usersSearchSchema } from "@starter/admin/search";
import {
  Button,
  ConfirmDialog,
  Input,
  ListPager,
  Page,
  PageHeader,
  Panel,
  Select,
  StatusChip,
  TableState,
  TableWrap,
  Textarea,
  Time,
} from "@starter/admin/ui";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/users/")({
  validateSearch: usersSearchSchema,
  component: UsersPage,
});

type StatusTarget = {
  userId: string;
  email: string;
  disabled: boolean;
};

function UsersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [target, setTarget] = useState<StatusTarget | null>(null);
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const query = useQuery(
    orpc.users.list.queryOptions({
      input: {
        q: search.q,
        status: search.status,
        page: search.page,
        pageSize: search.pageSize,
      },
      placeholderData: keepPreviousData,
    }),
  );

  const change = useMutation(
    orpc.users.setDisabled.mutationOptions({
      onSuccess: (result) => {
        toast.success(
          result.replayed
            ? "该操作已执行过（幂等重放），未重复生效"
            : result.response.disabled
              ? "账户已禁用，现有会话已全部撤销"
              : "账户已恢复，可重新登录",
        );
        void queryClient.invalidateQueries({ queryKey: orpc.users.list.key() });
        setTarget(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function updateSearch(patch: Partial<typeof search>) {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: nextPageAfterSearchPatch(patch, prev.page ?? 1),
      }),
    });
  }

  function openDialog(next: StatusTarget) {
    setReason("");
    setIdempotencyKey(crypto.randomUUID());
    setTarget(next);
  }

  return (
    <Page>
      <PageHeader title="用户" description="搜索账户，查看注册时间并按需禁用或恢复。" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateSearch({ q: searchInput.trim() || undefined });
          }}
        >
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="邮箱 / 名称 / 用户 ID"
            aria-label="搜索用户"
            className="h-11 min-w-0 md:h-9"
          />
          <Button type="submit" variant="outline" className="shrink-0 px-3">
            <Search className="size-4" strokeWidth={1.5} />
            搜索
          </Button>
        </form>
        <Select
          value={search.status ?? "all"}
          aria-label="账户状态"
          className="h-11 w-28 shrink-0 md:h-9"
          onChange={(event) =>
            updateSearch({ status: event.target.value as "all" | "active" | "disabled" })
          }
        >
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">已禁用</option>
        </Select>
      </div>

      <Panel>
        <TableWrap>
          <table className="admin-table min-w-[640px]">
            <thead>
              <tr>
                <th>邮箱</th>
                <th>名称</th>
                <th>注册时间</th>
                <th>状态</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-64 truncate">{row.email}</td>
                  <td className="max-w-40 truncate text-muted-foreground">{row.name || "—"}</td>
                  <td className="whitespace-nowrap text-[11px] text-muted-foreground">
                    <Time value={row.createdAt} />
                  </td>
                  <td>
                    <StatusChip tone={row.disabled ? "danger" : "ok"}>
                      {row.disabled ? "已禁用" : "正常"}
                    </StatusChip>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to="/users/$userId" params={{ userId: row.id }} className="admin-link">
                        详情
                      </Link>
                      <Button
                        variant={row.disabled ? "outline" : "destructive"}
                        size="sm"
                        disabled={change.isPending}
                        onClick={() =>
                          openDialog({ userId: row.id, email: row.email, disabled: !row.disabled })
                        }
                      >
                        {row.disabled ? "恢复" : "禁用"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {query.data && query.data.items.length === 0 ? (
                <TableState colSpan={5}>没有匹配的用户</TableState>
              ) : null}
              {query.isError && !query.data ? (
                <TableState colSpan={5} tone="danger">
                  用户列表加载失败，请重试。
                </TableState>
              ) : null}
              {!query.data && !query.isError ? <TableState colSpan={5}>加载中…</TableState> : null}
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
          onPageChange={(page) => updateSearch({ page })}
          onPageSizeChange={(pageSize) => updateSearch({ pageSize })}
        />
      ) : null}

      <ConfirmDialog
        open={target != null}
        title={target?.disabled ? "禁用账户" : "恢复账户"}
        description={
          target?.disabled
            ? `${target.email} 将被登出、无法重新登录或发起受保护请求，直到恢复。`
            : `${target?.email ?? ""} 可以重新登录；旧会话不会恢复。`
        }
        confirmLabel={target?.disabled ? "确认禁用" : "确认恢复"}
        tone={target?.disabled ? "destructive" : "default"}
        pending={change.isPending}
        onClose={() => {
          if (!change.isPending) setTarget(null);
        }}
        onConfirm={() => {
          if (!target) return;
          change.mutate({
            userId: target.userId,
            disabled: target.disabled,
            reason: reason.trim() || undefined,
            idempotencyKey,
          });
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="admin-label">原因（选填，仅记入审计日志）</span>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="例如：滥用配额 / 用户申诉"
            maxLength={500}
          />
        </label>
      </ConfirmDialog>
    </Page>
  );
}
