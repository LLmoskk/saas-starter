import type { ReactNode } from "react";

import { cn } from "./cn";

export function MetricCard({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string | number;
  tone?: "danger";
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4">
      <p className="admin-label">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-mono text-2xl font-bold",
          tone === "danger" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
