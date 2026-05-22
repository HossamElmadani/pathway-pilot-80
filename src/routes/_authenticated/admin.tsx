import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Building2,
  UserPlus,
  LogOut,
  GraduationCap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isStaff, isStudent, loading, profile, signOut, isDirector } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isStaff && isStudent) navigate({ to: "/student" });
  }, [loading, isStaff, isStudent, navigate]);

  const nav: { to: string; icon: typeof LayoutDashboard; label: string; exact?: boolean }[] = [
    { to: "/admin", icon: LayoutDashboard, label: t("crm.dashboard"), exact: true },
    { to: "/admin/students", icon: Users, label: t("crm.students") },
    { to: "/admin/validation", icon: CheckSquare, label: t("crm.validation") },
    { to: "/admin/universities", icon: Building2, label: t("crm.universities") },
    { to: "/admin/invite", icon: UserPlus, label: t("crm.invite") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {t("app.name")}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {isDirector ? "Director" : "Worker"} console
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {nav.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-sidebar-border p-3">
            <div className="rounded-lg bg-sidebar-accent/50 p-3">
              <div className="flex items-center gap-1.5">
                <Shield className={cn("h-3 w-3", isDirector ? "text-warning" : "text-primary")} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isDirector ? "Director" : "Worker"}
                </span>
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-sidebar-foreground">
                {profile?.name}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{profile?.email}</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setLang("fr")}
                className={cn(
                  "flex-1 rounded-md py-1 text-[10px] font-medium",
                  lang === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                FR
              </button>
              <button
                onClick={() => setLang("ar")}
                className={cn(
                  "flex-1 rounded-md py-1 text-[10px] font-medium",
                  lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                AR
              </button>
            </div>
            <Button onClick={signOut} variant="outline" size="sm" className="w-full">
              <LogOut className="mr-1 h-3 w-3" /> {t("auth.logout")}
            </Button>
          </div>
        </aside>

        <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 backdrop-blur px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-gold">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">{isDirector ? "Director" : "Worker"}</span>
          </div>
          <Button onClick={signOut} variant="ghost" size="sm"><LogOut className="h-4 w-4" /></Button>
        </div>

        <main className="flex-1 min-w-0 pb-24 md:pb-0 pt-16 md:pt-0">
          <Outlet />
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
            <ul className="flex">
              {nav.map((n) => {
                const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <li key={n.to} className="flex-1">
                    <Link
                      to={n.to}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </main>
      </div>
    </div>
  );
}
