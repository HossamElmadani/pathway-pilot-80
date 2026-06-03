import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Check, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX = 5;

type University = {
  id: string;
  name: string;
  location: string;
  country: string | null;
  price: number | null;
  ranking: number | null;
  badges: string[] | null;
  description: string | null;
};

export function Step3Universities() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: universities = [], isLoading } = useQuery({
    queryKey: ["suggested-for-student", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: sug, error } = await supabase
        .from("suggested_universities")
        .select("university_id")
        .eq("student_id", user!.id);
      if (error) throw error;
      const ids = (sug ?? []).map((r) => r.university_id);
      if (ids.length === 0) return [] as University[];
      const { data, error: uErr } = await supabase
        .from("universities")
        .select("id,name,location,country,price,ranking,badges,description")
        .in("id", ids)
        .order("ranking", { ascending: true, nullsFirst: false });
      if (uErr) throw uErr;
      return (data ?? []) as University[];
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
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id)
        .eq("university_id", uniId);
      if (error) return toast.error(error.message);
    } else {
      if (selectedIds.size >= MAX) return toast.error(`Maximum ${MAX} universités`);
      const { error } = await supabase
        .from("applications")
        .insert({ user_id: user.id, university_id: uniId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["applications"] });
  };

  const submit = async () => {
    if (!user) return;
    if (selectedIds.size === 0) return toast.error("Sélectionnez au moins une université");
    const { error } = await supabase.from("step_progress").upsert(
      [
        { user_id: user.id, step: 3, status: "approved" },
        { user_id: user.id, step: 4, status: "in_progress" },
      ],
      { onConflict: "user_id,step" },
    );
    if (error) return toast.error(error.message);
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ current_step: 4 })
      .eq("id", user.id);
    if (pErr) return toast.error(pErr.message);
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Sélection confirmée — Étape 4 débloquée");
  };




  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Vos universités recommandées / جامعاتك المقترحة
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choisissez jusqu'à {MAX} universités · اختر {MAX} كحد أقصى. Cette liste est
              personnalisée par votre conseiller selon votre profil.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
        <span className="text-muted-foreground">Maximum {MAX} universités</span>
        <span className="font-semibold text-primary">
          {selectedIds.size} / {MAX}
        </span>
      </div>

      {!isLoading && universities.length === 0 && (
        <Card className="border-dashed border-border bg-card p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">Aucune suggestion pour le moment</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Votre conseiller préparera bientôt une liste personnalisée d'universités pour vous.
            <br />
            <span dir="rtl">سيقوم مستشارك قريبًا بإعداد قائمة جامعات مخصصة لك.</span>
          </p>
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

      {universities.length > 0 && (
        <Button
          onClick={submit}
          className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
        >
          Confirmer ma sélection / تأكيد اختياري
        </Button>
      )}
    </div>
  );
}
