import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plane } from "lucide-react";

export function Step7Departure() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prog } = useQuery({
    queryKey: ["step-data", 7, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("step_progress")
        .select("data,status")
        .eq("user_id", user!.id)
        .eq("step", 7)
        .maybeSingle();
      return data;
    },
  });

  const init = (prog?.data as Record<string, string> | undefined) ?? {};
  const [f, setF] = useState({
    airline: init.airline ?? "",
    flight_number: init.flight_number ?? "",
    departure: init.departure ?? "",
    arrival: init.arrival ?? "",
    pickup: init.pickup ?? "",
    notes: init.notes ?? "",
  });

  const save = async (submitting = false) => {
    if (!user) return;
    await supabase
      .from("step_progress")
      .upsert(
        {
          user_id: user.id,
          step: 7,
          status: submitting ? "pending_review" : "in_progress",
          data: f,
        },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step-data"] });
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    toast.success(submitting ? "Soumis" : "Enregistré");
  };

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Plane className="h-4 w-4 text-primary" /> Détails du vol
        </div>
        <div className="space-y-3">
          <Row label="Compagnie aérienne" value={f.airline} on={(v) => setF({ ...f, airline: v })} />
          <Row label="N° de vol" value={f.flight_number} on={(v) => setF({ ...f, flight_number: v })} />
          <Row
            label="Date de départ"
            type="datetime-local"
            value={f.departure}
            on={(v) => setF({ ...f, departure: v })}
          />
          <Row
            label="Date d'arrivée"
            type="datetime-local"
            value={f.arrival}
            on={(v) => setF({ ...f, arrival: v })}
          />
        </div>
      </Card>

      <Card className="border-border bg-card p-4">
        <Label className="text-sm font-semibold">Logistique d'arrivée</Label>
        <div className="mt-3 space-y-3">
          <Row
            label="Personne / service de récupération"
            value={f.pickup}
            on={(v) => setF({ ...f, pickup: v })}
          />
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => save(false)} className="flex-1">
          Enregistrer
        </Button>
        <Button
          onClick={() => save(true)}
          className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold"
        >
          Finaliser
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  on,
  type = "text",
}: {
  label: string;
  value: string;
  on: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
