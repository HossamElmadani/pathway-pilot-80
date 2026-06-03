import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setApplicationStatus } from "@/lib/agency.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { GraduationCap, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: ApplicationsPage,
});

const STATUSES = ["pending", "submitted", "accepted", "rejected", "waitlisted"] as const;
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-warning/15 text-warning",
  accepted: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
  waitlisted: "bg-primary/15 text-primary",
};

type Row = {
  id: string;
  status: string;
  user_id: string;
  universities: { name: string; location: string | null; country: string | null } | null;
  profiles: { name: string | null; email: string | null } | null;
};

function ApplicationsPage() {
  const qc = useQueryClient();
  const setStatus = useServerFn(setApplicationStatus);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id,status,user_id,universities(name,location,country),profiles!applications_user_id_fkey(name,email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.user_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  const onChange = async (id: string, status: typeof STATUSES[number]) => {
    try {
      await setStatus({ data: { applicationId: id, status } });
      toast.success(
        status === "accepted"
          ? "Statut mis à jour — Étape 5 débloquée"
          : "Statut mis à jour",
      );
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["staff-students"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Candidatures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mettez à jour le statut des candidatures. Passer à « Accepted » débloque
          automatiquement l'Étape 5 de l'étudiant.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : grouped.size === 0 ? (
        <Card className="border-border bg-card p-6 text-sm text-muted-foreground">
          Aucune candidature pour le moment.
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {[...grouped.entries()].map(([uid, apps]) => (
            <AccordionItem
              key={uid}
              value={uid}
              className="rounded-xl border border-border bg-card px-3"
            >
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{apps[0].profiles?.name ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{apps[0].profiles?.email}</p>
                  </div>
                  <Badge className="ml-2 border-0 bg-muted text-muted-foreground">
                    {apps.length} candidature{apps.length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-3">
                  {apps.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.universities?.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {a.universities?.location}
                            {a.universities?.country ? ` · ${a.universities.country}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`border-0 ${STATUS_COLOR[a.status] ?? ""}`}>
                          {a.status}
                        </Badge>
                        <Select
                          value={a.status}
                          onValueChange={(v) => onChange(a.id, v as typeof STATUSES[number])}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
