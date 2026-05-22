import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { buildStepMap, progressPct, STEPS, STEP_KEYS } from "@/lib/steps";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { user, profile } = useAuth();
  const { t } = useI18n();

  const { data: rows = [] } = useQuery({
    queryKey: ["step_progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("step_progress")
        .select("step,status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stepMap = buildStepMap(rows as { step: number; status: any }[]);
  const { done, total, pct } = progressPct(stepMap);

  return (
    <div className="px-5 pt-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("app.name")}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-foreground">
          {t("home.greeting")}, {profile?.name?.split(" ")[0] ?? "👋"}
        </h1>

        <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-elevated">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold text-gradient-gold">{pct}%</span>
            <span className="text-xs text-muted-foreground">
              {t("home.progress", { pct, done, total })}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-gradient-gold transition-all"
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative ml-5 mt-6">
        <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
        <ul className="space-y-5">
          {STEPS.map((s, i) => {
            const status = stepMap.get(s) ?? "locked";
            const isApproved = status === "approved";
            const isActive = status === "in_progress" || status === "submitted";
            const isLocked = status === "locked";
            return (
              <li key={s} className="relative pl-16">
                <NodeBubble status={status} index={i + 1} />
                <div
                  className={cn(
                    "rounded-2xl border p-4 transition",
                    isLocked
                      ? "border-border/60 bg-surface/40 opacity-60"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Step {s}
                    </span>
                    <StatusPill status={status} t={t} />
                  </div>
                  <h3 className="mt-1 font-display text-base font-semibold text-foreground">
                    {t(STEP_KEYS[s])}
                  </h3>
                  {!isLocked ? (
                    <Link
                      to="/student/step/$step"
                      params={{ step: String(s) }}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {isApproved ? "Voir" : isActive ? "Continuer" : "Ouvrir"} →
                    </Link>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> Étape précédente requise
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NodeBubble({ status, index }: { status: string; index: number }) {
  if (status === "approved") {
    return (
      <span className="absolute left-0 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground shadow-elevated">
        <Check className="h-5 w-5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "in_progress" || status === "submitted") {
    return (
      <span className="absolute left-0 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-warning text-warning-foreground ring-2 ring-warning/50 ring-offset-2 ring-offset-background [border:2px_dashed_var(--warning)]">
        <span className="font-display text-sm font-bold">{index}</span>
      </span>
    );
  }
  return (
    <span className="absolute left-0 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
      <Lock className="h-4 w-4" />
    </span>
  );
}

function StatusPill({ status, t }: { status: string; t: any }) {
  if (status === "approved")
    return (
      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
        {t("step.completed")}
      </span>
    );
  if (status === "in_progress" || status === "submitted")
    return (
      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
        {t("step.active")}
      </span>
    );
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {t("step.locked")}
    </span>
  );
}
