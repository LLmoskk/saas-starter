import { Page, PageHeader, Section, StatusChip, TableWrap, Time } from "@starter/admin/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/jobs")({ component: JobsPage });

function JobsPage() {
  const jobs = useQuery(orpc.jobs.list.queryOptions());
  return (
    <Page>
      <PageHeader title="生成任务" />
      <Section title="最近任务" contentClassName="!p-0">
        <TableWrap>
          <table className="admin-table min-w-[760px]">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>流程</th>
                <th>状态</th>
                <th>积分</th>
                <th>供应商成本</th>
              </tr>
            </thead>
            <tbody>
              {jobs.data?.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Time value={job.createdAt} />
                  </td>
                  <td className="font-mono">{job.userId}</td>
                  <td>{job.flowId}</td>
                  <td>
                    <StatusChip
                      tone={
                        job.status === "succeeded"
                          ? "ok"
                          : job.status === "failed"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {job.status}
                    </StatusChip>
                  </td>
                  <td>{job.creditCost}</td>
                  <td>{job.actualCost ?? "—"}</td>
                </tr>
              ))}
              {jobs.data?.length === 0 ? (
                <tr>
                  <td colSpan={6}>暂无任务</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableWrap>
        {jobs.isError ? (
          <p role="alert" className="p-4 text-destructive">
            任务加载失败
          </p>
        ) : null}
      </Section>
    </Page>
  );
}
