import { createFileRoute } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
const authClient = createAuthClient();
export const Route = createFileRoute("/login")({
  component: () => (
    <main className="panel">
      <h1>Admin sign in</h1>
      <button
        className="button"
        onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
      >
        Continue with Google
      </button>
    </main>
  ),
});
