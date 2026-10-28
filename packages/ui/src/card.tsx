import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Card({
  as: Element = "section",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "main" | "section" | "article" | "div" }) {
  return (
    <Element
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-6 text-card-foreground max-sm:p-4",
        className,
      )}
      {...props}
    />
  );
}
