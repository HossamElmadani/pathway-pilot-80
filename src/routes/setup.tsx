import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ adminName: "Director", adminEmail: "", adminPassword: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.adminPassword.length < 8) return toast.error("Mot de passe ≥ 8 caractères");
    setLoading(true);
    const res = await fetch("/api/public/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(json.error ?? "Échec");
    toast.success("Configuration terminée — connectez-vous");
    navigate({ to: "/login" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 rounded-2xl bg-gradient-gold p-3 shadow-gold">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold">Configuration initiale</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez le compte Directeur. Cette page n'est disponible qu'une seule fois.
            </p>
          </div>
          <Card className="border-border/60 bg-card/80 p-6 shadow-elevated">
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom du directeur</Label>
                <Input value={f.adminName} onChange={(e) => setF({ ...f, adminName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={f.adminEmail}
                  onChange={(e) => setF({ ...f, adminEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={f.adminPassword}
                  onChange={(e) => setF({ ...f, adminPassword: e.target.value })}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GraduationCap className="mr-2 h-4 w-4" /> Créer le Directeur
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
