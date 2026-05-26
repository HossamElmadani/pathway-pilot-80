import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Info,
  Loader2,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  { value: "scholarship", fr: "Bourse d'études", ar: "منحة دراسية" },
  { value: "ranking", fr: "Classement", ar: "التصنيف" },
  { value: "location", fr: "Emplacement", ar: "الموقع" },
  { value: "low_fees", fr: "Frais bas", ar: "رسوم منخفضة" },
  { value: "campus", fr: "Qualité du campus", ar: "جودة الحرم الجامعي" },
] as const;

const schema = z.object({
  // Step 1
  first_name: z.string().trim().min(1, "Requis").max(80),
  last_name: z.string().trim().min(1, "Requis").max(80),
  dob: z.string().min(1, "Requis"),
  gender: z.enum(["male", "female"], { required_error: "Requis" }),
  whatsapp: z.string().trim().min(6, "Numéro invalide").max(30),
  // Step 2
  current_level: z.enum(["bac_obtenu", "bac_en_cours", "licence", "master"], {
    required_error: "Requis",
  }),
  filiere: z.string().trim().min(1, "Requis").max(120),
  gpa: z.coerce.number().min(0).max(20),
  english_grade: z.coerce.number().min(0).max(20),
  studied_in_china: z.enum(["yes", "no"], { required_error: "Requis" }),
  // Step 3
  desired_degree: z.enum(["language", "bachelor", "master", "phd"], {
    required_error: "Requis",
  }),
  desired_major: z.string().trim().min(1, "Requis").max(120),
  // Step 4
  annual_budget: z.coerce.number().min(0),
  priorities: z
    .array(z.string())
    .min(1, "Choisissez au moins une priorité")
    .max(3, "Maximum 3 priorités"),
  preferred_ranking: z.enum(["top100", "top500", "any"], {
    required_error: "Requis",
  }),
});

type FormValues = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["first_name", "last_name", "dob", "gender", "whatsapp"],
  1: ["current_level", "filiere", "gpa", "english_grade", "studied_in_china"],
  2: ["desired_degree", "desired_major"],
  3: ["annual_budget", "priorities", "preferred_ranking"],
};

const STEP_TITLES = [
  { fr: "Informations Personnelles", ar: "المعلومات الشخصية" },
  { fr: "Informations Académiques", ar: "المعلومات الأكاديمية" },
  { fr: "Projet d'Études", ar: "مشروع الدراسة" },
  { fr: "Budget & Priorités", ar: "الميزانية والأولويات" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Step1Info() {
  const { user, refresh } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { data: profileData } = useQuery({
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      dob: "",
      gender: undefined as any,
      whatsapp: "",
      current_level: undefined as any,
      filiere: "",
      gpa: undefined as any,
      english_grade: undefined as any,
      studied_in_china: undefined as any,
      desired_degree: undefined as any,
      desired_major: "",
      annual_budget: undefined as any,
      priorities: [],
      preferred_ranking: undefined as any,
    },
  });

  // Hydrate from Supabase
  useEffect(() => {
    if (!profileData) return;
    const p = (profileData.personal_info ?? {}) as any;
    const a = (profileData.academic_info ?? {}) as any;
    form.reset({
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      dob: p.dob ?? "",
      gender: p.gender ?? undefined,
      whatsapp: p.whatsapp ?? profileData.phone ?? "",
      current_level: a.current_level ?? undefined,
      filiere: a.filiere ?? "",
      gpa: a.gpa ?? ("" as any),
      english_grade: a.english_grade ?? ("" as any),
      studied_in_china: a.studied_in_china ?? undefined,
      desired_degree: a.desired_degree ?? undefined,
      desired_major: a.desired_major ?? "",
      annual_budget: a.annual_budget ?? ("" as any),
      priorities: a.priorities ?? [],
      preferred_ranking: a.preferred_ranking ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData]);

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(3, s + 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const personal_info = {
        first_name: values.first_name,
        last_name: values.last_name,
        dob: values.dob,
        gender: values.gender,
        whatsapp: values.whatsapp,
      };
      const academic_info = {
        current_level: values.current_level,
        filiere: values.filiere,
        gpa: values.gpa,
        english_grade: values.english_grade,
        studied_in_china: values.studied_in_china,
        desired_degree: values.desired_degree,
        desired_major: values.desired_major,
        annual_budget: values.annual_budget,
        priorities: values.priorities,
        preferred_ranking: values.preferred_ranking,
      };
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          name: `${values.first_name} ${values.last_name}`.trim(),
          phone: values.whatsapp,
          personal_info,
          academic_info,
          current_step: 2,
        })
        .eq("id", user.id);
      if (pErr) throw pErr;

      const { error: s1Err } = await supabase.from("step_progress").upsert(
        {
          user_id: user.id,
          step: 1,
          status: "completed",
          data: { personal_info, academic_info },
        },
        { onConflict: "user_id,step" },
      );
      if (s1Err) throw s1Err;

      const { error: s2Err } = await supabase.from("step_progress").upsert(
        { user_id: user.id, step: 2, status: "in_progress" },
        { onConflict: "user_id,step" },
      );
      if (s2Err) throw s2Err;

      toast.success("Informations enregistrées — Étape 2 débloquée");
      qc.invalidateQueries({ queryKey: ["profile-info"] });
      qc.invalidateQueries({ queryKey: ["step_progress"] });
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Video — only on step 0 */}
        {step === 0 && (
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
              <PlayCircle className="h-4 w-4 text-primary" /> Tutoriel — Comment
              remplir vos informations
            </div>
          </Card>
        )}

        {/* Instructions — only on step 0 */}
        {step === 0 && (
          <Alert className="border-primary/40 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>Important :</strong> Vos nom et prénom doivent être
              identiques à ceux de votre passeport. Toute différence peut
              entraîner un rejet de votre dossier.
              <br />
              <span dir="rtl" className="mt-1 block">
                <strong>هام:</strong> يجب أن يتطابق اسمك مع جواز السفر تمامًا.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Stepper */}
        <Stepper current={step} />

        <Card className="border-border bg-card p-4 space-y-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {STEP_TITLES[step].fr}
            </h3>
            <p dir="rtl" className="text-xs text-muted-foreground">
              {STEP_TITLES[step].ar}
            </p>
          </div>

          {step === 0 && <StepPersonal form={form} />}
          {step === 1 && <StepAcademic form={form} />}
          {step === 2 && <StepProject form={form} />}
          {step === 3 && <StepBudget form={form} />}
        </Card>

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={prev}
            disabled={step === 0 || submitting}
            className="flex-1"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={next}
              className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold"
            >
              Suivant <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" /> Soumettre
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Stepper                                                            */
/* ------------------------------------------------------------------ */

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition",
              i < current && "bg-emerald-500 text-white",
              i === current &&
                "bg-gradient-gold text-primary-foreground shadow-gold",
              i > current && "bg-muted text-muted-foreground",
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < 3 && (
            <div
              className={cn(
                "h-px flex-1 transition",
                i < current ? "bg-emerald-500" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-fields                                                         */
/* ------------------------------------------------------------------ */

function FieldShell({
  fr,
  ar,
  children,
  error,
  hint,
}: {
  fr: string;
  ar: string;
  children: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm text-foreground">
          {fr}
          {hint}
        </Label>
        <span dir="rtl" className="text-[11px] text-muted-foreground">
          {ar}
        </span>
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StepPersonal({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldShell
          fr="Prénom"
          ar="الاسم الشخصي"
          error={e.first_name?.message as string}
        >
          <Input {...form.register("first_name")} placeholder="Mohammed" />
        </FieldShell>
        <FieldShell
          fr="Nom de famille"
          ar="الاسم العائلي"
          error={e.last_name?.message as string}
        >
          <Input {...form.register("last_name")} placeholder="El Alaoui" />
        </FieldShell>
      </div>
      <FieldShell
        fr="Date de naissance"
        ar="تاريخ الازدياد"
        error={e.dob?.message as string}
      >
        <Input type="date" {...form.register("dob")} />
      </FieldShell>
      <Controller
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FieldShell fr="Sexe" ar="الجنس" error={e.gender?.message as string}>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Homme — ذكر</SelectItem>
                <SelectItem value="female">Femme — أنثى</SelectItem>
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      />
      <FieldShell
        fr="Numéro WhatsApp"
        ar="رقم الواتساب"
        error={e.whatsapp?.message as string}
      >
        <Input
          type="tel"
          {...form.register("whatsapp")}
          placeholder="+212 6 12 34 56 78"
        />
      </FieldShell>
    </div>
  );
}

function StepAcademic({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="space-y-3">
      <Controller
        control={form.control}
        name="current_level"
        render={({ field }) => (
          <FieldShell
            fr="Niveau actuel"
            ar="المستوى الحالي"
            error={e.current_level?.message as string}
          >
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bac_obtenu">Bac obtenu</SelectItem>
                <SelectItem value="bac_en_cours">En cours de Bac</SelectItem>
                <SelectItem value="licence">Licence</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      />
      <FieldShell
        fr="Filière"
        ar="التخصص"
        error={e.filiere?.message as string}
      >
        <Input
          {...form.register("filiere")}
          placeholder="Sciences Physiques, Économie…"
        />
      </FieldShell>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldShell
          fr="Moyenne générale (/20)"
          ar="المعدل العام"
          error={e.gpa?.message as string}
        >
          <Input
            type="number"
            step="0.01"
            min={0}
            max={20}
            {...form.register("gpa")}
          />
        </FieldShell>
        <FieldShell
          fr="Note en Anglais (/20)"
          ar="نقطة الإنجليزية"
          error={e.english_grade?.message as string}
        >
          <Input
            type="number"
            step="0.01"
            min={0}
            max={20}
            {...form.register("english_grade")}
          />
        </FieldShell>
      </div>
      <Controller
        control={form.control}
        name="studied_in_china"
        render={({ field }) => (
          <FieldShell
            fr="Avez-vous déjà étudié en Chine ?"
            ar="هل سبقت لك الدراسة في الصين؟"
            error={e.studied_in_china?.message as string}
          >
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="yes" /> Oui — نعم
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="no" /> Non — لا
              </label>
            </RadioGroup>
          </FieldShell>
        )}
      />
    </div>
  );
}

function StepProject({ form }: { form: any }) {
  const e = form.formState.errors;
  return (
    <div className="space-y-3">
      <Controller
        control={form.control}
        name="desired_degree"
        render={({ field }) => (
          <FieldShell
            fr="Diplôme souhaité"
            ar="الشهادة المطلوبة"
            error={e.desired_degree?.message as string}
          >
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="language">Année de Langue</SelectItem>
                <SelectItem value="bachelor">Bachelor / Licence</SelectItem>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="phd">Doctorat</SelectItem>
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      />
      <FieldShell
        fr="Spécialité souhaitée"
        ar="التخصص المطلوب"
        error={e.desired_major?.message as string}
      >
        <Input
          {...form.register("desired_major")}
          placeholder="Software Engineering, Business…"
        />
      </FieldShell>
    </div>
  );
}

function StepBudget({ form }: { form: any }) {
  const e = form.formState.errors;
  const priorities: string[] = form.watch("priorities") ?? [];
  return (
    <div className="space-y-3">
      <FieldShell
        fr="Budget annuel (MAD)"
        ar="الميزانية السنوية (بالدرهم)"
        error={e.annual_budget?.message as string}
        hint={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ml-1 inline-flex align-middle text-muted-foreground hover:text-primary"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Couvre les frais de scolarité + hébergement (dortoir).
            </TooltipContent>
          </Tooltip>
        }
      >
        <Input type="number" min={0} {...form.register("annual_budget")} />
      </FieldShell>

      <Controller
        control={form.control}
        name="priorities"
        render={({ field }) => (
          <FieldShell
            fr="Priorités (max. 3)"
            ar="الأولويات (٣ كحد أقصى)"
            error={e.priorities?.message as string}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRIORITIES.map((p) => {
                const checked = (field.value ?? []).includes(p.value);
                const disabled =
                  !checked && (field.value ?? []).length >= 3;
                return (
                  <label
                    key={p.value}
                    className={cn(
                      "flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm transition",
                      checked && "border-primary/60 bg-primary/10",
                      disabled && "opacity-50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(c) => {
                        const v = field.value ?? [];
                        field.onChange(
                          c ? [...v, p.value] : v.filter((x: string) => x !== p.value),
                        );
                      }}
                    />
                    <span className="flex-1">{p.fr}</span>
                    <span
                      dir="rtl"
                      className="text-[11px] text-muted-foreground"
                    >
                      {p.ar}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {priorities.length}/3 sélectionnées
            </p>
          </FieldShell>
        )}
      />

      <Controller
        control={form.control}
        name="preferred_ranking"
        render={({ field }) => (
          <FieldShell
            fr="Classement préféré"
            ar="التصنيف المفضل"
            error={e.preferred_ranking?.message as string}
          >
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top100">Top 100</SelectItem>
                <SelectItem value="top500">Top 500</SelectItem>
                <SelectItem value="any">Indifférent — أي تصنيف</SelectItem>
              </SelectContent>
            </Select>
          </FieldShell>
        )}
      />
    </div>
  );
}
