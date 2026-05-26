import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Check,
  X,
  Clock,
  Trash2,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DocDef = { type: string; fr: string; ar: string };

const MANDATORY: DocDef[] = [
  {
    type: "passport",
    fr: "Passeport (Page d'information)",
    ar: "جواز السفر (صفحة المعلومات)",
  },
  {
    type: "id_photo",
    fr: "Photo d'identité (Fond blanc)",
    ar: "صورة شخصية (خلفية بيضاء)",
  },
  {
    type: "transcript",
    fr: "Relevé de notes de la dernière année",
    ar: "كشف نقاط السنة الأخيرة",
  },
  {
    type: "diploma",
    fr: "Diplôme (ou attestation de scolarité)",
    ar: "الشهادة (أو شهادة مدرسية)",
  },
];

const OPTIONAL: DocDef[] = [
  {
    type: "english_cert",
    fr: "Certificat d'Anglais (IELTS / TOEFL)",
    ar: "شهادة اللغة الإنجليزية",
  },
  {
    type: "recommendation",
    fr: "Lettre de recommandation",
    ar: "رسالة توصية",
  },
  {
    type: "medical_cert",
    fr: "Certificat médical",
    ar: "شهادة طبية",
  },
];

type Doc = {
  id: string;
  type: string;
  file_name: string;
  file_url: string;
  status: "pending" | "approved" | "rejected";
  feedback: string | null;
  created_at: string;
};

export function Step2Documents() {
  const { user } = useAuth();

  const { data: docs = [], isLoading } = useQuery({
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

  const approvedMandatory = MANDATORY.filter((m) =>
    docs.some((d) => d.type === m.type && d.status === "approved"),
  ).length;

  return (
    <div className="space-y-6 pb-4">
      {/* Instructional header */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 p-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              Documents requis / المستندات المطلوبة
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Téléversez des <span className="text-foreground">PDF scannés clairs</span> ou
              des <span className="text-foreground">JPEG haute qualité</span>. Les fichiers
              flous ou mal cadrés seront rejetés.
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground" dir="rtl">
              قم بتحميل ملفات PDF ممسوحة ضوئيًا بوضوح أو صور JPEG عالية الجودة.
            </p>
          </div>
        </div>
      </Card>

      {/* Progress strip */}
      <div className="rounded-xl border border-border bg-card/50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Documents obligatoires validés
          </span>
          <span className="font-semibold text-foreground">
            {approvedMandatory} / {MANDATORY.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-gold transition-all"
            style={{ width: `${(approvedMandatory / MANDATORY.length) * 100}%` }}
          />
        </div>
      </div>

      <Section
        title="Documents Obligatoires"
        titleAr="المستندات الإلزامية"
        items={MANDATORY}
        docs={docs}
        mandatory
        loading={isLoading}
      />

      <Section
        title="Documents Optionnels"
        titleAr="المستندات الاختيارية"
        subtitle="Augmentent vos chances d'admission"
        items={OPTIONAL}
        docs={docs}
        loading={isLoading}
      />

      {/* Info footer */}
      <Card className="border-border/60 bg-muted/30 p-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
          Aucune soumission manuelle requise. Votre conseiller validera chaque document.
          L'étape suivante se débloquera automatiquement.
        </p>
      </Card>
    </div>
  );
}

function Section({
  title,
  titleAr,
  subtitle,
  items,
  docs,
  mandatory = false,
  loading,
}: {
  title: string;
  titleAr: string;
  subtitle?: string;
  items: DocDef[];
  docs: Doc[];
  mandatory?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">
            {title}
            {mandatory && <span className="ml-1 text-destructive">*</span>}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] font-medium text-primary/80" dir="rtl">
          {titleAr}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((it) => (
          <DocSlot
            key={it.type}
            def={it}
            mandatory={mandatory}
            existing={docs.filter((d) => d.type === it.type)}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

function DocSlot({
  def,
  mandatory,
  existing,
  loading,
}: {
  def: DocDef;
  mandatory: boolean;
  existing: Doc[];
  loading?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const top = existing[0];
  const isApproved = top?.status === "approved";

  const upload = async (file: File) => {
    if (!user) return;

    // Validate type
    const okTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!okTypes.includes(file.type)) {
      return toast.error("Format non supporté. Utilisez PDF, JPEG ou PNG.");
    }
    if (file.size > 10 * 1024 * 1024) {
      return toast.error("Fichier trop volumineux (max 10 Mo)");
    }

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/step-2/${def.type}-${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);

    // If replacing, delete previous pending row for cleanliness
    if (top && top.status !== "approved") {
      await supabase.from("documents").delete().eq("id", top.id);
    }

    const { error } = await supabase.from("documents").insert({
      user_id: user.id,
      step: 2,
      type: def.type,
      file_url: pub.publicUrl,
      file_name: file.name,
      is_mandatory: mandatory,
      status: "pending",
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Document téléversé. En attente de validation.");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const status: "empty" | "pending" | "approved" | "rejected" = top
    ? (top.status as "pending" | "approved" | "rejected")
    : "empty";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-card p-3.5 transition-all",
        status === "approved" && "border-success/40 bg-success/5",
        status === "rejected" && "border-destructive/40 bg-destructive/5",
        status === "pending" && "border-warning/40 bg-warning/5",
        status === "empty" && "border-border",
      )}
    >
      {/* left accent bar */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          status === "approved" && "bg-success",
          status === "rejected" && "bg-destructive",
          status === "pending" && "bg-warning",
          status === "empty" && "bg-muted",
        )}
      />

      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              status === "approved" && "bg-success/15 text-success",
              status === "rejected" && "bg-destructive/15 text-destructive",
              status === "pending" && "bg-warning/15 text-warning",
              status === "empty" && "bg-muted text-muted-foreground",
            )}
          >
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">
              {def.fr}
            </p>
            <p
              className="truncate text-[11px] leading-tight text-muted-foreground"
              dir="rtl"
            >
              {def.ar}
            </p>
            {top && (
              <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground/80">
                {top.file_name}
              </p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 flex items-center gap-2 pl-1.5">
        <input
          ref={ref}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant={status === "empty" ? "default" : "outline"}
          className={cn(
            "h-8 flex-1 text-xs",
            status === "empty" &&
              "bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90",
          )}
          disabled={uploading || isApproved || loading}
          onClick={() => ref.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Téléversement…
            </>
          ) : isApproved ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Validé
            </>
          ) : status === "empty" ? (
            <>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Téléverser
            </>
          ) : (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Changer le fichier
            </>
          )}
        </Button>
        {top && top.status === "pending" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => remove(top.id)}
            disabled={uploading}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {top?.status === "rejected" && top.feedback && (
        <div className="mt-3 ml-1.5 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
            <X className="h-3 w-3" />
            Motif du rejet / سبب الرفض
          </p>
          <p className="text-[11px] leading-relaxed text-destructive/90">
            {top.feedback}
          </p>
        </div>
      )}
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "empty" | "pending" | "approved" | "rejected";
}) {
  if (status === "approved")
    return (
      <Badge className="shrink-0 border-0 bg-success/15 text-[10px] text-success">
        <Check className="mr-1 h-3 w-3" />
        Approuvé
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="shrink-0 border-0 bg-destructive/15 text-[10px] text-destructive">
        <X className="mr-1 h-3 w-3" />
        Rejeté
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="shrink-0 border-0 bg-warning/15 text-[10px] text-warning">
        <Clock className="mr-1 h-3 w-3" />
        En révision
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-border bg-transparent text-[10px] text-muted-foreground"
    >
      À téléverser
    </Badge>
  );
}
