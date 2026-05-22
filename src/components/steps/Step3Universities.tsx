import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Check, Trophy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX = 5;

export function Step3Universities() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("ranking", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: apps = [] } = useQuery({
    queryKey: ["applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,university_id,status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedIds = new Set(apps.map((a) => a.university_id));

  const toggle = async (uniId: string) => {
    if (!user) return;
    if (selectedIds.has(uniId)) {
      await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id)
        .eq("university_id", uniId);
    } else {
      if (selectedIds.size >= MAX) return toast.error(`Max ${MAX} universités`);
      await supabase.from("applications").insert({ user_id: user.id, university_id: uniId });
    }
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const submit = async () => {
    if (!user) return;
    if (selectedIds.size === 0) return toast.error("Sélectionnez au moins une université");
    await supabase
      .from("step_progress")
      .upsert(
        { user_id: user.id, step: 3, status: "pending_review" },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    toast.success("Sélection soumise");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
        <span className="text-muted-foreground">Max. 5 universités</span>
        <span className="font-semibold text-primary">
          {selectedIds.size} / {MAX}
        </span>
      </div>

      {universities.length === 0 && (
        <Card className="border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Aucune université n'a encore été ajoutée.
        </Card>
      )}

      {universities.map((u) => {
        const selected = selectedIds.has(u.id);
        return (
          <Card
            key={u.id}
            className={cn(
              "border bg-card p-4 transition",
              selected ? "border-primary shadow-gold" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-semibold text-foreground">{u.name}</h3>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {u.location}
                  {u.country ? ` · ${u.country}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {u.ranking && (
                    <Badge className="border-0 bg-warning/15 text-warning">
                      <Star className="mr-1 h-3 w-3" /> #{u.ranking}
                    </Badge>
                  )}
                  {u.price != null && (
                    <Badge className="border-0 bg-muted text-foreground">
                      €{Number(u.price).toLocaleString()}
                    </Badge>
                  )}
                  {(u.badges as string[])?.map((b) => (
                    <Badge key={b} className="border-0 bg-primary/15 text-primary">
                      <Trophy className="mr-1 h-3 w-3" />
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => toggle(u.id)}
                className={cn(
                  selected
                    ? "bg-success text-success-foreground hover:opacity-90"
                    : "bg-gradient-gold text-primary-foreground shadow-gold",
                )}
              >
                {selected ? <Check className="h-4 w-4" /> : "Sélectionner"}
              </Button>
            </div>
          </Card>
        );
      })}

      <Button
        onClick={submit}
        className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
      >
        Soumettre la sélection
      </Button>
    </div>
  );
}
