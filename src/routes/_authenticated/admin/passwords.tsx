import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { setUserPassword } from "@/lib/agency.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, Loader2, Search, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/passwords")({
  component: PasswordsPage,
});

type Row = {
  id: string;
  name: string;
  email: string;
  role: "director" | "worker" | "student";
  assigned_worker_id: string | null;
};

function PasswordsPage() {
  const { user, isDirector } = useAuth();
  const changePwd = useServerFn(setUserPassword);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<Row | null>(null);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pwd-users", user?.id, isDirector],
    enabled: !!user,
    queryFn: async () => {
      const { data: roleRows } = await supabase.from("user_roles").select("user_id,role");
      const roleMap = new Map<string, Row["role"]>();
      (roleRows ?? []).forEach((r) => {
        // Director > worker > student precedence for display
        const prev = roleMap.get(r.user_id);
        const order = { director: 3, worker: 2, student: 1 } as const;
        if (!prev || order[r.role as Row["role"]] > order[prev]) {
          roleMap.set(r.user_id, r.role as Row["role"]);
        }
      });

      let pq = supabase.from("profiles").select("id,name,email,assigned_worker_id");
      if (!isDirector) {
        // Workers can only manage their assigned students.
        pq = pq.eq("assigned_worker_id", user!.id);
      }
      const { data } = await pq.order("name");
      return (data ?? [])
        .map<Row>((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: roleMap.get(p.id) ?? "student",
          assigned_worker_id: p.assigned_worker_id,
        }))
        .filter((r) => (isDirector ? true : r.role === "student"));
    },
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const openFor = (r: Row) => {
    setTarget(r);
    setPwd("");
    setConfirm("");
  };

  const submit = async () => {
    if (!target) return;
    if (pwd.length < 8) return toast.error("Le mot de passe doit contenir au moins 8 caractères");
    if (pwd !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setSaving(true);
    try {
      await changePwd({ data: { userId: target.id, password: pwd } });
      toast.success(`Mot de passe mis à jour pour ${target.name}`);
      setTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold shadow-gold">
          <KeyRound className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">Mots de passe</h1>
          <p className="text-sm text-muted-foreground">
            {isDirector
              ? "Gérez les mots de passe de tous les utilisateurs."
              : "Gérez les mots de passe de vos étudiants assignés uniquement."}
          </p>
        </div>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="pl-9"
        />
      </div>

      <Card className="mt-4 border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{r.name}</p>
                    <Badge
                      variant="outline"
                      className={
                        r.role === "director"
                          ? "border-warning/40 text-warning"
                          : r.role === "worker"
                            ? "border-primary/40 text-primary"
                            : "border-border text-muted-foreground"
                      }
                    >
                      <Shield className="mr-1 h-3 w-3" />
                      {r.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openFor(r)}>
                  <KeyRound className="mr-1 h-3 w-3" /> Changer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              {target && (
                <>
                  Définir un nouveau mot de passe pour <strong>{target.name}</strong> ({target.email}).
                  {target.id !== user?.id && (
                    <span className="mt-1 block text-xs">
                      L'utilisateur devra le changer à sa prochaine connexion.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmer</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-gradient-gold text-primary-foreground shadow-gold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
