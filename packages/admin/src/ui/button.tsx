import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:brightness-110",
  outline:
    "border border-border bg-card text-muted-foreground hover:border-primary-line hover:text-foreground",
  ghost: "text-muted-foreground hover:bg-raised hover:text-foreground",
  destructive:
    "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-11 px-3 text-xs md:h-9",
  md: "h-11 px-3.5 text-sm md:h-10",
  icon: "size-11 p-0 md:size-9",
};

export function Button({
  className,
  variant = "default",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[filter,background-color,border-color,color,scale] duration-150 outline-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
