import type { ReactNode } from "react";

import { cn } from "./cn";

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-full flex-col gap-4 p-4 md:p-6", className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-mono text-lg font-bold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  contentClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Panel>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-mono text-sm font-bold text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4", contentClassName)}>{children}</div>
    </Panel>
  );
}

/** 详情页键值行：左侧固定宽度大写 mono 标签，右侧可换行值。 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="w-28 shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="min-w-0 break-all text-xs text-foreground">{children}</span>
    </div>
  );
}

export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("admin-label", className)}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-3 py-10 text-center text-xs text-muted-foreground">{children}</p>;
}

/** 表格内的加载/空集合/错误占位行，避免每个列表重复同一个 tr/td 结构。 */
export function TableState({
  colSpan,
  tone = "muted",
  children,
}: {
  colSpan: number;
  tone?: "muted" | "danger";
  children: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        role={tone === "danger" ? "alert" : undefined}
        className={cn(
          "px-3 py-10 text-center text-xs",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {children}
      </td>
    </tr>
  );
}

/** 表格外框：小屏横向滚动，避免列被压扁。 */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("admin-table-wrap", className)}>{children}</div>;
}
