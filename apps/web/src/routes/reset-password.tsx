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
    setMessage(result.error?.message ?? "Password reset. You can sign in.");
  }
  return (
    <main className="panel">
      <h1>Reset password</h1>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          New password
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button">Save</button>
      </form>
      <p>{message}</p>
    </main>
  );
}
export const Route = createFileRoute("/reset-password")({ component: Reset });
