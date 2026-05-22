import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Users, Clock, Plane, TrendingUp, Briefcase } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { profile, isDirector, user } = useAuth();
  const { t } = useI18n();

  // Build a base "scope" — for workers, restrict to their assigned students.
  // RLS already enforces this; we still apply explicit filters for accurate counts.
  const studentFilter = (q: ReturnType<typeof supabase.from> extends infer _ ? any : any) => q;

  const { data: stats } = useQuery({
    queryKey: ["admin-stats", user?.id, isDirector],
    enabled: !!user,
    queryFn: async () => {
      // students count
      let studentsQ = supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (!isDirector) studentsQ = studentsQ.eq("assigned_worker_id", user!.id);
      const students = await studentsQ;

      // pending docs — RLS scopes for workers
      const pending = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      const visas = await supabase
        .from("step_progress")
        .select("id", { count: "exact", head: true })
        .eq("step", 6);

      return {
        students: students.count ?? 0,
        pending: pending.count ?? 0,
        visas: visas.count ?? 0,
      };
    },
  });

  const { data: stepDistribution = [] } = useQuery({
    queryKey: ["step-dist", user?.id, isDirector],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("profiles").select("current_step");
      if (!isDirector) q = q.eq("assigned_worker_id", user!.id);
      const { data } = await q;
      const counts = new Array(7).fill(0);
      (data ?? []).forEach((p) => {
        const i = (p.current_step ?? 1) - 1;
        if (i >= 0 && i < 7) counts[i]++;
      });
      return counts.map((c, i) => ({ step: i + 1, count: c }));
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-perf"],
    enabled: isDirector,
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "worker");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,name,email")
        .in("id", ids);
      const counts = await Promise.all(
        (profs ?? []).map(async (w) => {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("assigned_worker_id", w.id);
          return { ...w, students: count ?? 0 };
        }),
      );
      return counts;
    },
  });

  const max = Math.max(1, ...stepDistribution.map((d) => d.count));

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
          {t("crm.dashboard")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDirector ? "Vue globale de l'agence" : `Vos étudiants assignés — ${profile?.name}`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard icon={Users} label={t("crm.kpi.students")} value={stats?.students ?? 0} color="primary" />
        <KpiCard icon={Clock} label={t("crm.kpi.pending")} value={stats?.pending ?? 0} color="warning" />
        <KpiCard icon={Plane} label={t("crm.kpi.visas")} value={stats?.visas ?? 0} color="success" />
      </div>

      <Card className="border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Distribution par étape</h3>
            <p className="text-xs text-muted-foreground">Où se trouvent les étudiants</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-3">
          {stepDistribution.map((d) => (
            <div key={d.step} className="flex items-center gap-3">
              <span className="w-14 text-xs text-muted-foreground">Étape {d.step}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-surface-2 h-2.5">
                <div
                  className="h-full bg-gradient-gold transition-all"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold">{d.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {isDirector && (
        <Card className="border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Performance des conseillers</h3>
              <p className="text-xs text-muted-foreground">Étudiants par worker</p>
            </div>
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          {workers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun conseiller. Créez-en un depuis "Inviter".
            </p>
          ) : (
            <div className="space-y-2">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-2/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{w.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{w.email}</p>
                  </div>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {w.students} étudiants
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: "primary" | "warning" | "success";
}) {
  const ring =
    color === "primary"
      ? "bg-primary/15 text-primary"
      : color === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-success/15 text-success";
  return (
    <Card className="border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ring}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}
