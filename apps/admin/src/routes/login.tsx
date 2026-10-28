import { LoginPage } from "@starter/admin/ui";
import { createFileRoute } from "@tanstack/react-router";

import { adminAuthClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.orpc.features.queryOptions()),
  component: LoginRoute,
});

function LoginRoute() {
  const features = Route.useLoaderData();
  return (
    <LoginPage
      available={features.google}
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
