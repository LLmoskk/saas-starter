import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { env } from "@starter/env/web";
import { m } from "@/paraglide/messages";
const authClient = createAuthClient();
type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: { sitekey: string; action: string; callback: (token: string) => void },
  ) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
function Turnstile({ onToken }: { onToken: (value: string) => void }) {
  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    const element = document.getElementById("auth-turnstile");
    const render = () => {
      if (cancelled || !element || !window.turnstile || id) return;
      id = window.turnstile.render(element, {
        sitekey: env.VITE_TURNSTILE_SITE_KEY,
        action: "auth",
        callback: onToken,
      });
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
    };
  }, [onToken]);
  return <div id="auth-turnstile" />;
}
function Login() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Complete the verification first.");
      return;
    }
    const headers = { "x-captcha-response": token };
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password }, { headers })
          : mode === "signup"
            ? await authClient.signUp.email({ email, password, name }, { headers })
            : await authClient.requestPasswordReset(
                { email, redirectTo: `${location.origin}/reset-password` },
                { headers },
              );
      if (result.error) throw new Error(result.error.message);
      if (mode === "reset") setMessage("Check your email.");
      else location.href = "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setToken("");
      window.turnstile?.reset();
    }
  }
  return (
    <main className="panel">
      <h1>
        {mode === "signup"
          ? m["auth.signup"]()
          : mode === "reset"
            ? m["auth.reset"]()
            : m["auth.signin"]()}
      </h1>
      <form className="stack" onSubmit={submit}>
        {mode === "signup" ? (
          <label className="field">
            {m["auth.name"]()}
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        ) : null}
        <label className="field">
          {m["auth.email"]()}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== "reset" ? (
          <label className="field">
            {m["auth.password"]()}
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        ) : null}
        <Turnstile onToken={setToken} />
        <button className="button" type="submit">
          {mode === "signup"
            ? m["auth.signup"]()
            : mode === "reset"
              ? m["auth.reset"]()
              : m["auth.signin"]()}
        </button>
      </form>
      <p className="error">{error}</p>
      <p>{message}</p>
      <div className="nav">
        <button onClick={() => setMode("signin")}>{m["auth.signin"]()}</button>
        <button onClick={() => setMode("signup")}>{m["auth.signup"]()}</button>
        <button onClick={() => setMode("reset")}>{m["auth.reset"]()}</button>
      </div>
      <p>
        <button
          className="button"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/app" })}
        >
          {m["auth.google"]()}
        </button>
      </p>
    </main>
  );
}
export const Route = createFileRoute("/login")({ component: Login });
