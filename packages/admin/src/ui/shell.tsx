import { Link, useMatchRoute } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { getAdminConfig, type AdminNavItem } from "../config";
import { cn } from "./cn";

export type AdminShellUser = {
  id: string;
  name: string;
  email: string;
};

// ≥44px 触控区；桌面收窄为常规行高
const navItemClass =
  "flex h-11 min-h-11 items-center gap-2.5 rounded-md border border-transparent px-2.5 font-mono text-[11px] font-medium text-dim no-underline hover:bg-raised hover:text-foreground md:h-9 md:min-h-9 [&.active]:border-primary-line [&.active]:bg-primary-soft [&.active]:font-bold [&.active]:text-primary";

export function AdminShell({
  me,
  nav,
  onSignOut,
  children,
  footer,
}: {
  me: AdminShellUser;
  nav: AdminNavItem[];
  onSignOut: () => void | Promise<void>;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { brand, shell } = getAdminConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const matchRoute = useMatchRoute();
  const close = () => setMobileOpen(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await onSignOut();
  }

  const mark = (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-primary-line bg-primary-soft font-mono text-[11px] font-bold text-primary">
      {brand.mark ?? brand.name.slice(0, 1)}
    </span>
  );

  const navList = (
    <nav className="flex flex-col gap-0.5 px-3">
      {nav.map((item) => {
        const active = matchRoute({
          to: item.to as never,
          fuzzy: item.to !== "/",
        });
        return (
          <Link
            key={item.to}
            to={item.to as never}
            onClick={close}
            className={cn(navItemClass, active && "active")}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const identity = (
    <div className="border-t border-border p-3">
      <div className="mb-2 truncate px-2.5 font-mono text-[11px] text-muted-foreground">
        {me.email}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className={cn(navItemClass, "w-full cursor-pointer disabled:opacity-50")}
      >
        <LogOut className="size-4 shrink-0" strokeWidth={1.5} />
        <span>{signingOut ? "正在退出…" : shell.signOut}</span>
      </button>
      {footer}
    </div>
  );

  return (
    <div className="flex h-full bg-background md:flex-row">
      {mobileOpen ? (
        <div
          role="button"
          tabIndex={-1}
          aria-label={shell.closeMenu}
          onClick={close}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xs md:hidden"
        />
      ) : null}

      {/* 移动端抽屉 */}
      <aside
        inert={!mobileOpen}
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 min-w-64 flex-col border-r border-border bg-background transition-transform duration-150 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-foreground">
            {mark}
            {brand.name}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label={shell.closeMenu}
            className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3">{navList}</div>
        {identity}
      </aside>

      {/* 桌面侧边栏 */}
      <aside className="hidden h-full w-60 min-w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          {mark}
          <span className="truncate font-mono text-sm font-bold tracking-[0.08em] text-foreground">
            {brand.name}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-3">{navList}</div>
        {identity}
      </aside>

      <main className="flex h-full min-w-0 flex-1 flex-col">
        {/* 移动端顶栏 */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={shell.openMenu}
            className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-foreground hover:border-primary hover:text-primary"
          >
            <Menu className="size-4" strokeWidth={1.5} />
          </button>
          <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-foreground">
            {mark}
            {brand.name}
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
