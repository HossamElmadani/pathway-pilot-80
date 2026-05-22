import { GenericDocumentStep } from "./GenericDocumentStep";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Step6Visa() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prog } = useQuery({
    queryKey: ["step-data", 6, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("step_progress")
        .select("data")
        .eq("user_id", user!.id)
        .eq("step", 6)
        .maybeSingle();
      return data;
    },
  });

  const [date, setDate] = useState<string>(
    ((prog?.data as { appointment_date?: string } | undefined)?.appointment_date) ?? "",
  );

  const saveDate = async () => {
    if (!user) return;
    await supabase
      .from("step_progress")
      .upsert(
        {
          user_id: user.id,
          step: 6,
          status: "in_progress",
          data: { appointment_date: date },
        },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step-data"] });
    toast.success("Date enregistrée");
  };

  return (
    <div className="space-y-5">
      <Card className="border-border bg-card p-4">
        <Label className="text-sm font-semibold">Rendez-vous à l'ambassade</Label>
        <div className="mt-3 flex gap-2">
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={saveDate} className="bg-gradient-gold text-primary-foreground">
            Enregistrer
          </Button>
        </div>
      </Card>

      <GenericDocumentStep
        step={6}
        title="Documents pour l'ambassade"
        slots={[
          { type: "visa_form", label: "Formulaire de visa", mandatory: true },
          { type: "financial_proof", label: "Justificatif de ressources", mandatory: true },
          { type: "insurance", label: "Assurance santé", mandatory: true },
          { type: "accommodation", label: "Preuve de logement", mandatory: true },
        ]}
      />
    </div>
  );
}
