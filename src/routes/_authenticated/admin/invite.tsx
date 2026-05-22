import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { inviteStudent, inviteWorker } from "@/lib/agency.functions";
import { toast } from "sonner";
import { Loader2, Copy, UserPlus, Check, Briefcase } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/invite")({
  component: InvitePage,
});

function InvitePage() {
  const invite = useServerFn(inviteStudent);
  const inviteW = useServerFn(inviteWorker);
  const { isDirector } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", email: "", phone: "", assignedWorkerId: "" });
  const [wf, setWf] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-for-assign"],
    enabled: isDirector,
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "worker");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id,name").in("id", ids);
      return data ?? [];
    },
  });

  const submitStudent = async () => {
    if (!f.name || !f.email) return toast.error("Nom et email requis");
    setLoading(true);
    try {
      const r = await invite({
        data: {
          name: f.name,
          email: f.email,
          phone: f.phone || undefined,
          assignedWorkerId:
            isDirector && f.assignedWorkerId && f.assignedWorkerId !== "__none__"
              ? f.assignedWorkerId
              : null,
        },
      });
      setLastInvite({ email: r.email, password: r.tempPassword });
      setF({ name: "", email: "", phone: "", assignedWorkerId: "" });
      qc.invalidateQueries({ queryKey: ["staff-students"] });
      toast.success("Étudiant invité");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
    setLoading(false);
  };

  const submitWorker = async () => {
    if (!wf.name || !wf.email) return toast.error("Nom et email requis");
    setLoading(true);
    try {
      const r = await inviteW({ data: wf });
      setLastInvite({ email: r.email, password: r.tempPassword });
      setWf({ name: "", email: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["workers-for-assign"] });
      qc.invalidateQueries({ queryKey: ["workers-perf"] });
      toast.success("Conseiller créé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
    setLoading(false);
  };

  const copyCreds = () => {
    if (!lastInvite) return;
    navigator.clipboard.writeText(
      `Email: ${lastInvite.email}\nMot de passe temporaire: ${lastInvite.password}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Créer un compte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un mot de passe temporaire sera généré — l'utilisateur le changera à la première connexion.
      </p>

      <Tabs defaultValue="student" className="mt-6">
        <TabsList className={isDirector ? "grid w-full grid-cols-2" : "grid w-full grid-cols-1"}>
          <TabsTrigger value="student">
            <UserPlus className="mr-1 h-3 w-3" /> Étudiant
          </TabsTrigger>
          {isDirector && (
            <TabsTrigger value="worker">
              <Briefcase className="mr-1 h-3 w-3" /> Conseiller
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="student">
          <Card className="border-border bg-card p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom complet</Label>
                <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone (optionnel)</Label>
                <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              </div>
              {isDirector && (
                <div className="space-y-1.5">
                  <Label>Assigner à un conseiller (optionnel)</Label>
                  <Select
                    value={f.assignedWorkerId || "__none__"}
                    onValueChange={(v) => setF({ ...f, assignedWorkerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Non assigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Non assigné</SelectItem>
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                onClick={submitStudent}
                disabled={loading}
                className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Créer l'étudiant
                  </>
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {isDirector && (
          <TabsContent value="worker">
            <Card className="border-border bg-card p-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom complet</Label>
                  <Input value={wf.name} onChange={(e) => setWf({ ...wf, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={wf.email}
                    onChange={(e) => setWf({ ...wf, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone (optionnel)</Label>
                  <Input
                    value={wf.phone}
                    onChange={(e) => setWf({ ...wf, phone: e.target.value })}
                  />
                </div>
                <Button
                  onClick={submitWorker}
                  disabled={loading}
                  className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Briefcase className="mr-2 h-4 w-4" /> Créer le conseiller
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {lastInvite && (
        <Card className="mt-4 border-success/40 bg-success/10 p-5">
          <p className="text-sm font-semibold text-success">Identifiants générés</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Transmettez ces informations — le mot de passe devra être changé à la première connexion.
          </p>
          <div className="mt-3 rounded-lg bg-background/50 p-3 font-mono text-xs">
            <div>Email: {lastInvite.email}</div>
            <div>Mot de passe: {lastInvite.password}</div>
          </div>
          <Button onClick={copyCreds} size="sm" variant="outline" className="mt-3">
            {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </Card>
      )}
    </div>
  );
}
