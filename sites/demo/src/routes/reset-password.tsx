import { seoHead } from "@/utils/seo";
import { m } from "@/paraglide/messages";
import { Card, Button, Input } from "@starter/ui";
import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { useState } from "react";
const authClient = createAuthClient();
function Reset() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = new URLSearchParams(location.search).get("token") ?? "";
    const result = await authClient.resetPassword({ newPassword: password, token });
    setMessage(result.error?.message ?? m["auth.resetComplete"]());
  }
  return (
    <Card as="main">
      <h1>{m["auth.reset"]()}</h1>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          {m["auth.newPassword"]()}
          <Input
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button type="submit">{m["common.save"]()}</Button>
      </form>
      {message ? <p role="status">{message}</p> : null}
    </Card>
  );
}
export const Route = createFileRoute("/reset-password")({
  head: () => seoHead("/reset-password", { title: m["auth.reset"](), indexable: false }),
  component: Reset,
});
