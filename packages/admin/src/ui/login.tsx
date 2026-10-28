import { useState } from "react";

import { getAdminConfig } from "../config";
import { Button } from "./button";

/** 登录页只负责展示与调用回调，具体 Auth Provider 由应用注入。 */
export function LoginPage({
  onSignIn,
  pendingLabel = "正在跳转…",
  available = true,
}: {
  onSignIn: () => Promise<string | null | void>;
  pendingLabel?: string;
  available?: boolean;
}) {
  const { brand, login } = getAdminConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setPending(true);
    const message = await onSignIn();
    if (message) {
      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-panel sm:p-8">
        <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          {brand.name}
        </p>
        <h1 className="mt-1.5 font-mono text-xl font-bold text-foreground sm:text-2xl">
          {login.title}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
          {login.description}
        </p>

        <Button
          className="mt-6 h-11 w-full sm:mt-8 sm:h-12"
          disabled={pending || !available}
          onClick={handleSignIn}
        >
          {!available ? "Google 登录未启用" : pending ? pendingLabel : login.providerLabel}
        </Button>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {login.footer ? (
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            {login.footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}
