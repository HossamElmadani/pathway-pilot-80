// Server functions for staff (director/worker) operations.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function tempPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = "abcdefghijkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < 6; i++) s += b[Math.floor(Math.random() * b.length)];
  s += "!" + Math.floor(Math.random() * 90 + 10);
  return s;
}

async function getRoles(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as "director" | "worker" | "student");
}

export const inviteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional(),
        // director can pick a worker; worker auto-assigns to self
        assignedWorkerId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const callerRoles = await getRoles(userId);
    const isDirector = callerRoles.includes("director");
    const isWorker = callerRoles.includes("worker");
    if (!isDirector && !isWorker) throw new Error("Forbidden");

    const assigned = isDirector ? (data.assignedWorkerId ?? null) : userId;
    const password = tempPassword();

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");
    const newUserId = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      must_change_password: true,
      current_step: 1,
      assigned_worker_id: assigned,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "student" });
    if (rErr) throw new Error(rErr.message);

    await supabaseAdmin.from("step_progress").insert({
      user_id: newUserId,
      step: 1,
      status: "in_progress",
    });

    return { ok: true, email: data.email, tempPassword: password };
  });

export const inviteWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        name: z.string().min(1).max(120),
        phone: z.string().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const callerRoles = await getRoles(context.userId);
    if (!callerRoles.includes("director")) throw new Error("Only the Director can create workers");

    const password = tempPassword();
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");
    const newUserId = created.user.id;

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      must_change_password: true,
      current_step: 0,
      assigned_worker_id: null,
    });
    if (pErr) throw new Error(pErr.message);

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "worker" });
    if (rErr) throw new Error(rErr.message);

    return { ok: true, email: data.email, tempPassword: password };
  });

export const reassignStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        studentId: z.string().uuid(),
        workerId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const callerRoles = await getRoles(context.userId);
    if (!callerRoles.includes("director")) throw new Error("Only the Director can reassign students");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ assigned_worker_id: data.workerId })
      .eq("id", data.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        documentId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        feedback: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc, error } = await supabase
      .from("documents")
      .update({
        status: data.decision,
        feedback: data.feedback ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.documentId)
      .select("user_id, step")
      .single();
    if (error || !doc) throw new Error(error?.message ?? "Failed");

    const { data: allDocs } = await supabase
      .from("documents")
      .select("status,is_mandatory")
      .eq("user_id", doc.user_id)
      .eq("step", doc.step);
    const mand = (allDocs ?? []).filter((d) => d.is_mandatory);
    const allMandatoryApproved = mand.length > 0 && mand.every((d) => d.status === "approved");
    if (allMandatoryApproved) {
      await supabase.from("step_progress").upsert(
        {
          user_id: doc.user_id,
          step: doc.step,
          status: "approved",
          approved_by: userId,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,step" },
      );
    }
    return { ok: true };
  });

export const setStudentStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ studentId: z.string().uuid(), step: z.number().int().min(1).max(7) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ current_step: data.step })
      .eq("id", data.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ studentId: z.string().uuid(), step: z.number().int().min(1).max(7) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("step_progress").upsert(
      {
        user_id: data.studentId,
        step: data.step,
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      },
      { onConflict: "user_id,step" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Director: change any user's password (incl. self, workers, students).
// Worker: change password only for their assigned students.
// Students: forbidden.
export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const callerId = context.userId;
    const callerRoles = await getRoles(callerId);
    const isDirector = callerRoles.includes("director");
    const isWorker = callerRoles.includes("worker");
    if (!isDirector && !isWorker) throw new Error("Forbidden");

    if (!isDirector) {
      // Worker: must be changing an assigned student's password.
      const { data: target } = await supabaseAdmin
        .from("profiles")
        .select("assigned_worker_id")
        .eq("id", data.userId)
        .maybeSingle();
      if (!target || target.assigned_worker_id !== callerId) {
        throw new Error("You can only change passwords for your assigned students");
      }
      const targetRoles = await getRoles(data.userId);
      if (!targetRoles.includes("student")) {
        throw new Error("Workers can only change student passwords");
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    // If admin is changing someone else's password, force them to change it on next login.
    if (data.userId !== callerId) {
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", data.userId);
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", data.userId);
    }

    return { ok: true };
  });
