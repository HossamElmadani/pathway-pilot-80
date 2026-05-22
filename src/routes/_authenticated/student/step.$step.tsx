import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { buildStepMap, STEP_KEYS, type Step } from "@/lib/steps";
import { ArrowLeft, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Step1Info } from "@/components/steps/Step1Info";
import { Step2Documents } from "@/components/steps/Step2Documents";
import { Step3Universities } from "@/components/steps/Step3Universities";
import { Step4Tracking } from "@/components/steps/Step4Tracking";
import { Step5Admission } from "@/components/steps/Step5Admission";
import { Step6Visa } from "@/components/steps/Step6Visa";
import { Step7Departure } from "@/components/steps/Step7Departure";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/student/step/$step")({
  component: StepPage,
});

function StepPage() {
  const { step } = Route.useParams();
  const stepNum = Number(step) as Step;
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
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

  const stepMap = buildStepMap(rows as any);
  const status = stepMap.get(stepNum) ?? "locked";

  // Ensure a step_progress row exists when entering an unlocked step
  useEffect(() => {
    if (!user) return;
    if (status === "locked") return;
    const exists = (rows as any[]).find((r) => r.step === stepNum);
    if (!exists) {
      supabase
        .from("step_progress")
        .insert({
          user_id: user.id,
          step: stepNum,
          status: "in_progress",
        })
        .then(() => qc.invalidateQueries({ queryKey: ["step_progress"] }));
    }
  }, [user, rows, status, stepNum, qc]);

  if (stepNum < 1 || stepNum > 7) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Invalid step.</div>
    );
  }

  return (
    <div className="px-5 pt-6">
      <button
        onClick={() => navigate({ to: "/student" })}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> {t("nav.home")}
      </button>
      <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Step {stepNum} / 7
      </div>
      <h1 className="mb-5 font-display text-2xl font-semibold text-foreground">
        {t(STEP_KEYS[stepNum])}
      </h1>

      {status === "locked" ? (
        <Card className="border-border bg-card p-8 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Cette étape est verrouillée. Terminez l'étape précédente pour la débloquer.
          </p>
        </Card>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          {stepNum === 1 && <Step1Info />}
          {stepNum === 2 && <Step2Documents />}
          {stepNum === 3 && <Step3Universities />}
          {stepNum === 4 && <Step4Tracking />}
          {stepNum === 5 && <Step5Admission />}
          {stepNum === 6 && <Step6Visa />}
          {stepNum === 7 && <Step7Departure />}
        </>
      )}
    </div>
  );
}
