import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, MapPin, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/universities")({
  component: UniversitiesAdmin,
});

function UniversitiesAdmin() {
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["all-universities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("ranking", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [f, setF] = useState({
    name: "",
    location: "",
    country: "",
    price: "",
    ranking: "",
    badges: "",
    description: "",
  });

  const add = async () => {
    if (!f.name || !f.location) return toast.error("Nom et lieu requis");
    const { error } = await supabase.from("universities").insert({
      name: f.name,
      location: f.location,
      country: f.country,
      price: f.price ? Number(f.price) : null,
      ranking: f.ranking ? Number(f.ranking) : null,
      badges: f.badges
        ? f.badges
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      description: f.description || null,
    });
    if (error) return toast.error(error.message);
    setF({
      name: "",
      location: "",
      country: "",
      price: "",
      ranking: "",
      badges: "",
      description: "",
    });
    toast.success("Université ajoutée");
    qc.invalidateQueries({ queryKey: ["all-universities"] });
  };

  const remove = async (id: string) => {
    await supabase.from("universities").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["all-universities"] });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <h1 className="font-display text-3xl font-semibold">Catalogue universités</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez les universités proposées aux étudiants.
      </p>

      <Card className="mt-6 border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Ajouter une université</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Inp label="Nom" value={f.name} on={(v) => setF({ ...f, name: v })} />
          <Inp label="Ville" value={f.location} on={(v) => setF({ ...f, location: v })} />
          <Inp label="Pays" value={f.country} on={(v) => setF({ ...f, country: v })} />
          <Inp label="Prix (€)" value={f.price} on={(v) => setF({ ...f, price: v })} type="number" />
          <Inp
            label="Classement mondial"
            value={f.ranking}
            on={(v) => setF({ ...f, ranking: v })}
            type="number"
          />
          <Inp
            label="Badges (séparés par ,)"
            value={f.badges}
            on={(v) => setF({ ...f, badges: v })}
            placeholder="Top 10, Bourse"
          />
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            rows={2}
          />
        </div>
        <Button onClick={add} className="mt-4 bg-gradient-gold text-primary-foreground shadow-gold">
          <Plus className="mr-1 h-4 w-4" />
          Ajouter
        </Button>
      </Card>

      <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {data.length} universités
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((u) => (
          <Card key={u.id} className="border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display font-semibold">{u.name}</h3>
                <p className="text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {u.location} {u.country && `· ${u.country}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {u.ranking && (
                    <Badge className="border-0 bg-warning/15 text-warning">
                      <Star className="mr-1 h-3 w-3" />#{u.ranking}
                    </Badge>
                  )}
                  {u.price != null && (
                    <Badge className="border-0 bg-muted">
                      €{Number(u.price).toLocaleString()}
                    </Badge>
                  )}
                  {(u.badges as string[])?.map((b) => (
                    <Badge key={b} className="border-0 bg-primary/15 text-primary">
                      {b}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(u.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Inp({
  label,
  value,
  on,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  on: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => on(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
