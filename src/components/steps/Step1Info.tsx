import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";

export function Step1Info() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["profile-info", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("personal_info,academic_info,name,phone")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<any>(null);
  const init = data ?? null;
  const f = form ?? {
    name: init?.name ?? profile?.name ?? "",
    phone: init?.phone ?? "",
    personal: (init?.personal_info as any) ?? { dob: "", nationality: "", address: "" },
    academic: (init?.academic_info as any) ?? { school: "", degree: "", gpa: "", target_field: "" },
  };

  const update = (patch: any) => setForm({ ...f, ...patch });

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: f.name,
        phone: f.phone,
        personal_info: f.personal,
        academic_info: f.academic,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Information saved");
    qc.invalidateQueries({ queryKey: ["profile-info"] });
    refresh();
  };

  const submit = async () => {
    await save();
    if (!user) return;
    await supabase
      .from("step_progress")
      .upsert(
        {
          user_id: user.id,
          step: 1,
          status: "pending_review",
        },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    toast.success("Submitted for review");
  };

  return (
    <div className="space-y-4">
      {/* Tutorial */}
      <Card className="overflow-hidden border-border bg-card">
        <div className="aspect-video w-full bg-black">
          <iframe
            className="h-full w-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Tutorial"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
          <PlayCircle className="h-4 w-4 text-primary" /> Tutoriel — Comment remplir vos
          informations
        </div>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Personnel</TabsTrigger>
          <TabsTrigger value="academic">Académique</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4 space-y-4">
          <Card className="border-border bg-card p-4 space-y-3">
            <Field label="Nom complet" value={f.name} onChange={(v) => update({ name: v })} />
            <Field label="Téléphone" value={f.phone} onChange={(v) => update({ phone: v })} />
            <Field
              label="Date de naissance"
              type="date"
              value={f.personal.dob}
              onChange={(v) => update({ personal: { ...f.personal, dob: v } })}
            />
            <Field
              label="Nationalité"
              value={f.personal.nationality}
              onChange={(v) => update({ personal: { ...f.personal, nationality: v } })}
            />
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Textarea
                value={f.personal.address}
                onChange={(e) =>
                  update({ personal: { ...f.personal, address: e.target.value } })
                }
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="mt-4 space-y-4">
          <Card className="border-border bg-card p-4 space-y-3">
            <Field
              label="École / Université actuelle"
              value={f.academic.school}
              onChange={(v) => update({ academic: { ...f.academic, school: v } })}
            />
            <Field
              label="Diplôme"
              value={f.academic.degree}
              onChange={(v) => update({ academic: { ...f.academic, degree: v } })}
            />
            <Field
              label="Moyenne / GPA"
              value={f.academic.gpa}
              onChange={(v) => update({ academic: { ...f.academic, gpa: v } })}
            />
            <Field
              label="Domaine visé"
              value={f.academic.target_field}
              onChange={(v) => update({ academic: { ...f.academic, target_field: v } })}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={save} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
        </Button>
        <Button
          onClick={submit}
          disabled={saving}
          className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold"
        >
          Soumettre
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
