import { seoHead } from "@/utils/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Button, Card, Input } from "@starter/ui";
import { m } from "@/paraglide/messages";
import { localizeHref } from "@/paraglide/runtime";
import { orpc } from "@/utils/orpc";

const authClient = createAuthClient();
type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  // The external browser API augments the built-in Window declaration.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (value: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || !window.turnstile || id !== undefined) return;
      id = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: "auth",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]',
    );
    if (window.turnstile) render();
    else {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
    }
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [siteKey, onToken]);
  return <div ref={container} />;
}

function Login() {
  const features = useQuery(orpc.features.queryOptions());
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const siteKey = features.data?.turnstileSiteKey;
  const actionLabel =
    mode === "signup"
      ? m["auth.signup"]()
      : mode === "reset"
        ? m["auth.reset"]()
        : m["auth.signin"]();
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !features.data) return;
    setError("");
    setMessage("");
    if (siteKey && !token) {
      setError(m["auth.verificationRequired"]());
      return;
    }
    setPending(true);
    const headers = token ? { "x-captcha-response": token } : undefined;
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password }, { headers })
          : mode === "signup"
            ? await authClient.signUp.email({ email, password, name }, { headers })
            : await authClient.requestPasswordReset(
                {
                  email,
                  redirectTo: new URL(localizeHref("/reset-password"), location.origin).href,
                },
                { headers },
              );
      if (result.error) throw new Error(result.error.message);
      if (mode === "reset") setMessage(m["auth.checkEmail"]());
      else location.href = localizeHref("/app");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
      setToken("");
      if (siteKey) window.turnstile?.reset();
    }
  }
  return (
    <Card as="main" className="mx-auto max-w-md">
      <h1>{actionLabel}</h1>
      <form className="stack" onSubmit={submit}>
        {mode === "signup" ? (
          <label className="field">
            {m["auth.name"]()}
            <Input
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        ) : null}
        <label className="field">
          {m["auth.email"]()}
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {mode !== "reset" ? (
          <label className="field">
            {m["auth.password"]()}
            <Input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}
        {siteKey ? <Turnstile siteKey={siteKey} onToken={setToken} /> : null}
        <Button type="submit" disabled={pending || !features.data}>
          {pending ? m["auth.pending"]() : actionLabel}
        </Button>
      </form>
      {error || features.error ? (
        <p className="error" role="alert">
          {error || features.error?.message}
        </p>
      ) : null}
      {features.isError ? (
        <Button variant="outline" onClick={() => void features.refetch()}>
          {m["common.retry"]()}
        </Button>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["signin", "signup", ...(features.data?.email ? ["reset" as const] : [])] as const).map(
          (value) => (
            <Button
              key={value}
              variant={mode === value ? "outline" : "ghost"}
              disabled={pending}
              onClick={() => {
                setMode(value);
                setError("");
                setMessage("");
              }}
            >
              {value === "signup"
                ? m["auth.signup"]()
                : value === "reset"
                  ? m["auth.reset"]()
                  : m["auth.signin"]()}
            </Button>
          ),
        )}
      </div>
      {features.data?.google ? (
        <Button
          className="mt-4 w-full"
          variant="outline"
          onClick={async () => {
            const result = await authClient.signIn.social({
              provider: "google",
              callbackURL: localizeHref("/app"),
            });
            if (result.error) setError(result.error.message ?? m["auth.failed"]());
          }}
        >
          {m["auth.google"]()}
        </Button>
      ) : null}
    </Card>
  );
}
export const Route = createFileRoute("/login")({
  head: () => seoHead("/login", { title: m["auth.signin"](), indexable: false }),
  component: Login,
});
