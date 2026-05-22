import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: () => <Navigate to="/admin" />,
});
