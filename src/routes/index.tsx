import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { loading, isAuthenticated, isDirector, isWorker, isStudent, profile } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login" });
      return;
    }
    if (profile?.must_change_password) {
      navigate({ to: "/reset-password" });
      return;
    }
    if (isDirector) navigate({ to: "/director/dashboard" });
    else if (isWorker) navigate({ to: "/worker/dashboard" });
    else if (isStudent) navigate({ to: "/student/portal" });
    else navigate({ to: "/login" });
  }, [loading, isAuthenticated, isDirector, isWorker, isStudent, profile, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <div className="rounded-2xl bg-gradient-gold p-4 shadow-gold">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}
