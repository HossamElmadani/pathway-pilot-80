import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, MapPin, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studentId: string;
  studentName: string;
};

export function SuggestUniversitiesDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: universities = [] } = useQuery({
    queryKey: ["all-universities-picker"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id,name,location,country,price,ranking,badges")
        .order("ranking", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suggested = [] } = useQuery({
    queryKey: ["suggested", studentId],
    enabled: open && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggested_universities")
        .select("id,university_id")
        .eq("student_id", studentId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const suggestedMap = new Map(suggested.map((s) => [s.university_id, s.id]));

  const toggle = async (universityId: string) => {
    const existing = suggestedMap.get(universityId);
    if (existing) {
      const { error } = await supabase
        .from("suggested_universities")
        .delete()
        .eq("id", existing);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("suggested_universities").insert({
        student_id: studentId,
        university_id: universityId,
        suggested_by: user?.id ?? null,
      });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["suggested", studentId] });
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? universities.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.location ?? "").toLowerCase().includes(q) ||
          (u.country ?? "").toLowerCase().includes(q),
      )
    : universities;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-4 w-4 text-primary" />
            Suggérer des universités
          </DialogTitle>
          <DialogDescription>
            Pour <span className="font-medium text-foreground">{studentName}</span> ·{" "}
            {suggested.length} sélectionnée(s)
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville, pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="scrollbar-thin -mx-1 max-h-[55vh] space-y-2 overflow-y-auto px-1">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune université trouvée.
            </p>
          )}
          {filtered.map((u) => {
            const isSuggested = suggestedMap.has(u.id);
            return (
              <Card
                key={u.id}
                className={cn(
                  "flex items-start justify-between gap-3 border p-3 transition",
                  isSuggested ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
              >
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-display text-sm font-semibold">{u.name}</h4>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {u.location}
                    {u.country ? ` · ${u.country}` : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {u.ranking && (
                      <Badge className="border-0 bg-warning/15 text-[10px] text-warning">
                        <Star className="mr-1 h-3 w-3" />#{u.ranking}
                      </Badge>
                    )}
                    {u.price != null && (
                      <Badge className="border-0 bg-muted text-[10px]">
                        €{Number(u.price).toLocaleString()}
                      </Badge>
                    )}
                    {(u.badges as string[])?.slice(0, 2).map((b) => (
                      <Badge key={b} className="border-0 bg-primary/15 text-[10px] text-primary">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isSuggested ? "outline" : "default"}
                  onClick={() => toggle(u.id)}
                  className={cn(
                    !isSuggested && "bg-gradient-gold text-primary-foreground shadow-gold",
                  )}
                >
                  {isSuggested ? (
                    <>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Retirer
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Suggérer
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
