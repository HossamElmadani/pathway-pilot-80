import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/director/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
