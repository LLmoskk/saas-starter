import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/users")({
  component: Outlet,
});
