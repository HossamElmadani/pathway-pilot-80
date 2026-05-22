import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Check, X, Clock, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MANDATORY = [
  { type: "passport", label: "Passeport" },
  { type: "transcript", label: "Relevé de notes" },
  { type: "diploma", label: "Diplôme" },
  { type: "cv", label: "CV" },
];
const OPTIONAL = [
  { type: "motivation", label: "Lettre de motivation" },
  { type: "recommendation", label: "Lettre de recommandation" },
  { type: "language_cert", label: "Certificat de langue" },
];

type Doc = {
  id: string;
  type: string;
  file_name: string;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
};

export function Step2Documents() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", user?.id, 2],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .eq("step", 2)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });

  const submit = async () => {
    if (!user) return;
    const haveAll = MANDATORY.every((m) => docs.some((d) => d.type === m.type));
    if (!haveAll) return toast.error("Téléversez tous les documents obligatoires");
    await supabase
      .from("step_progress")
      .upsert(
        { user_id: user.id, step: 2, status: "pending_review" },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    toast.success("Documents soumis pour validation");
  };

  return (
    <div className="space-y-5">
      <Section title="Obligatoires" items={MANDATORY} docs={docs} mandatory />
      <Section title="Optionnels" items={OPTIONAL} docs={docs} />
      <Button
        onClick={submit}
        className="w-full bg-gradient-gold text-primary-foreground shadow-gold"
      >
        Soumettre pour validation
      </Button>
    </div>
  );
}

function Section({
  title,
  items,
  docs,
  mandatory = false,
}: {
  title: string;
  items: { type: string; label: string }[];
  docs: Doc[];
  mandatory?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((it) => (
          <DocSlot
            key={it.type}
            type={it.type}
            label={it.label}
            mandatory={mandatory}
            existing={docs.filter((d) => d.type === it.type)}
          />
        ))}
      </div>
    </div>
  );
}

function DocSlot({
  type,
  label,
  mandatory,
  existing,
}: {
  type: string;
  label: string;
  mandatory: boolean;
  existing: Doc[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/step-2/${type}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      step: 2,
      type,
      file_url: pub.publicUrl,
      file_name: file.name,
      is_mandatory: mandatory,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Téléversé");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const remove = async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const top = existing[0];

  return (
    <Card className="border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              top?.status === "approved"
                ? "bg-success/15 text-success"
                : top?.status === "rejected"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            {top && (
              <p className="truncate text-[10px] text-muted-foreground">{top.file_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {top && <StatusBadge status={top.status} />}
          <input
            ref={ref}
            type="file"
            hidden
            onChange={(e) => e.target.files && upload(e.target.files[0])}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => ref.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          {top && top.status === "pending" && (
            <Button size="sm" variant="ghost" onClick={() => remove(top.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      {top?.feedback && top.status === "rejected" && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {top.feedback}
        </p>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <Badge className="border-0 bg-success/15 text-success">
        <Check className="mr-1 h-3 w-3" />
        Approuvé
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="border-0 bg-destructive/15 text-destructive">
        <X className="mr-1 h-3 w-3" />
        Rejeté
      </Badge>
    );
  return (
    <Badge className="border-0 bg-muted text-muted-foreground">
      <Clock className="mr-1 h-3 w-3" />
      En attente
    </Badge>
  );
}
