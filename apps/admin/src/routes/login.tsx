import { LoginPage } from "@starter/admin/ui";
import { createFileRoute } from "@tanstack/react-router";

import { adminAuthClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <LoginPage
      onSignIn={async () => {
        const { error } = await adminAuthClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        });
        return error?.message ?? null;
      }}
    />
  );
}
