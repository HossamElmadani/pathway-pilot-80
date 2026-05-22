import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { STEP_KEYS, STEPS } from "@/lib/steps";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, UserCog } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { setStudentStep, reassignStudent } from "@/lib/agency.functions";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: StudentsKanban,
});

function StudentsKanban() {
  const { user, isDirector } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const setStep = useServerFn(setStudentStep);
  const reassign = useServerFn(reassignStudent);

  const { data: students = [] } = useQuery({
    queryKey: ["staff-students", user?.id, isDirector],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id,name,email,current_step,avatar_url,assigned_worker_id");
      if (!isDirector) q = q.eq("assigned_worker_id", user!.id);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      // exclude staff (those without 'student' role) — fetch student ids
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      const studentIds = new Set((roleRows ?? []).map((r) => r.user_id));
      return (data ?? []).filter((p) => studentIds.has(p.id));
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["all-workers"],
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const studentId = e.active.id as string;
    const newStep = Number(e.over.id);
    if (!Number.isFinite(newStep)) return;
    try {
      await setStep({ data: { studentId, step: newStep } });
      qc.invalidateQueries({ queryKey: ["staff-students"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const onReassign = async (studentId: string, workerId: string) => {
    try {
      await reassign({
        data: { studentId, workerId: workerId === "__unassigned__" ? null : workerId },
      });
      toast.success("Réassigné");
      qc.invalidateQueries({ queryKey: ["staff-students"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">CRM</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">{t("crm.students")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDirector
            ? "Pipeline global — glissez pour déplacer entre étapes."
            : "Vos étudiants assignés."}
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="scrollbar-thin overflow-x-auto">
          <div className="flex gap-3 pb-4" style={{ minWidth: "max-content" }}>
            {STEPS.map((s) => {
              const col = students.filter((st) => (st.current_step ?? 1) === s);
              return (
                <Column
                  key={s}
                  step={s}
                  title={t(STEP_KEYS[s])}
                  students={col}
                  workers={isDirector ? workers : []}
                  onReassign={onReassign}
                />
              );
            })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

type Student = {
  id: string;
  name: string;
  email: string;
  current_step: number;
  assigned_worker_id: string | null;
};

function Column({
  step,
  title,
  students,
  workers,
  onReassign,
}: {
  step: number;
  title: string;
  students: Student[];
  workers: { id: string; name: string }[];
  onReassign: (sid: string, wid: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(step) });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-2xl border bg-card/50 p-3 transition ${isOver ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Étape {step}</p>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {students.length}
        </span>
      </div>
      <div className="space-y-2">
        {students.map((s) => (
          <StudentCard key={s.id} student={s} workers={workers} onReassign={onReassign} />
        ))}
        {students.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
            Vide
          </div>
        )}
      </div>
    </div>
  );
}

function StudentCard({
  student,
  workers,
  onReassign,
}: {
  student: Student;
  workers: { id: string; name: string }[];
  onReassign: (sid: string, wid: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`space-y-2 border-border bg-card p-3 ${isDragging ? "opacity-50 shadow-elevated" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-gold text-xs font-bold text-primary-foreground">
          {student.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{student.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">{student.email}</p>
        </div>
      </div>
      {workers.length > 0 && (
        <div className="flex items-center gap-1.5">
          <UserCog className="h-3 w-3 text-muted-foreground" />
          <Select
            value={student.assigned_worker_id ?? "__unassigned__"}
            onValueChange={(v) => onReassign(student.id, v)}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Assigner…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Non assigné</SelectItem>
              {workers.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Card>
  );
}
