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

interface Slot {
  type: string;
  label: string;
  mandatory: boolean;
}

export function GenericDocumentStep({
  step,
  title,
  slots,
}: {
  step: number;
  title: string;
  slots: Slot[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["documents", user?.id, step],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .eq("step", step);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!user) return;
    const haveAll = slots
      .filter((s) => s.mandatory)
      .every((m) => docs.some((d) => d.type === m.type));
    if (!haveAll) return toast.error("Téléversez tous les documents obligatoires");
    await supabase
      .from("step_progress")
      .upsert(
        { user_id: user.id, step, status: "pending_review" },
        { onConflict: "user_id,step" },
      );
    qc.invalidateQueries({ queryKey: ["step_progress"] });
    toast.success("Soumis pour validation");
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {slots.map((s) => (
        <DocSlot
          key={s.type}
          step={step}
          type={s.type}
          label={s.label}
          mandatory={s.mandatory}
          existing={docs.filter((d) => d.type === s.type)}
        />
      ))}
      <Button onClick={submit} className="w-full bg-gradient-gold text-primary-foreground shadow-gold">
        Soumettre pour validation
      </Button>
    </div>
  );
}

type Doc = {
  id: string;
  type: string;
  file_name: string;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
};

function DocSlot({
  step,
  type,
  label,
  mandatory,
  existing,
}: {
  step: number;
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
    const path = `${user.id}/step-${step}/${type}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      step,
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
            <p className="truncate text-sm font-medium text-foreground">
              {label}
              {mandatory && <span className="ml-1 text-destructive">*</span>}
            </p>
            {top && (
              <p className="truncate text-[10px] text-muted-foreground">{top.file_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {top &&
            (top.status === "approved" ? (
              <Badge className="border-0 bg-success/15 text-success">
                <Check className="mr-1 h-3 w-3" />
              </Badge>
            ) : top.status === "rejected" ? (
              <Badge className="border-0 bg-destructive/15 text-destructive">
                <X className="mr-1 h-3 w-3" />
              </Badge>
            ) : (
              <Badge className="border-0 bg-muted text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
              </Badge>
            ))}
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
