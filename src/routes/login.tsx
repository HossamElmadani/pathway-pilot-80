import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, profile, isDirector, isWorker, isStudent } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      if (profile?.must_change_password) navigate({ to: "/reset-password" });
      else if (isDirector) navigate({ to: "/director/dashboard" });
      else if (isWorker) navigate({ to: "/worker/dashboard" });
      else if (isStudent) navigate({ to: "/student/portal" });
    }
  }, [authLoading, isAuthenticated, profile, isDirector, isWorker, isStudent, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      </div>

      {/* Lang switch */}
      <div className="absolute right-4 top-4 z-10 flex gap-1 rounded-full border border-border bg-surface/80 p-1 backdrop-blur">
        <button
          onClick={() => setLang("fr")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${lang === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          FR
        </button>
        <button
          onClick={() => setLang("ar")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${lang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          AR
        </button>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-2xl bg-gradient-gold p-3 shadow-gold">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {t("app.name")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("auth.login")}</p>
          </div>

          <Card className="border-border/60 bg-card/80 p-6 backdrop-blur shadow-elevated">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:opacity-95"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signIn")}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Accès sur invitation uniquement — contactez votre agence pour recevoir vos
              identifiants.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
