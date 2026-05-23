import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/worker/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
