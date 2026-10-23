import { cn } from "./cn";

export type StatusTone = "ok" | "danger" | "warning" | "neutral" | "accent";

const toneClass: Record<StatusTone, string> = {
  ok: "border-primary-line bg-primary-soft text-primary",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warning: "border-warning/40 bg-warning/10 text-warning",
  neutral: "border-border bg-raised text-dim",
  accent: "border-primary-line bg-primary-soft text-primary",
};

/** 状态徽标：16px 高、3px 圆角、等宽 9px 粗体，与 musictool 后台一致。 */
export function StatusChip({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-xs border px-1.5 font-mono text-[9px] font-bold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
