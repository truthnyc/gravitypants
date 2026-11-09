import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MOOD_FAMILIES, moodInput, moodRequestInput, normalizeMoodName } from "./mood-admin";

async function adminClient(context: { supabase: { rpc: (name: "is_platform_admin") => PromiseLike<{ data: unknown; error: unknown }> } }) {
  const { data, error } = await context.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Error("Not authorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listAdminMoods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const { data, error } = await db.from("moods").select("id,name,family,page_intro,sort_order").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moodInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const fields = { name: data.name, family: data.family, ...(data.page_intro !== undefined ? { page_intro: data.page_intro } : {}) };
    const result = data.id
      ? await db.from("moods").update(fields).eq("id", data.id).select("id").single()
      : await db.from("moods").insert(fields).select("id").single();
    if (result.error) throw new Error(result.error.code === "23505" ? "That mood already exists." : result.error.message);
    const { error } = await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.id ? "mood.update" : "mood.create", target: data.name });
    if (error) throw new Error(error.message);
    return result.data;
  });

export const deleteAdminMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: row, error } = await db.from("moods").delete().eq("id", data.id).select("name").single();
    if (error) throw new Error(error.message);
    const { error: auditError } = await db.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "mood.delete", target: row.name });
    if (auditError) throw new Error(auditError.message);
    return { ok: true };
  });

/** Signed-in: ask for a mood the master list doesn't have. Staff decide it under Admin → Moods. */
export const requestMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moodRequestInput.parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const name = normalizeMoodName(data.name);
    if (!name) throw new Error("Use 2–30 letters, numbers or spaces for a mood name.");
    const { data: have } = await sb.from("moods").select("name").eq("name", name).maybeSingle();
    if (have) throw new Error("That mood is already in the list.");
    const { data: pending } = await sb.from("mood_requests").select("id").eq("name", name).eq("status", "pending").maybeSingle();
    if (pending) throw new Error("That mood is already waiting for review.");
    const { error } = await sb.from("mood_requests").insert({
      name, requested_by: context.userId, ...(data.workspaceId ? { workspace_id: data.workspaceId } : {}),
    });
    if (error) throw new Error(error.code === "23505" ? "That mood is already waiting for review." : error.message);
    return { ok: true, name };
  });

/** Staff only: the mood request queue, newest first. */
export const listMoodRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const { data, error } = await db.from("mood_requests")
      .select("id, name, status, note, created_at, decided_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Staff only: approve adds the mood to the master list, deny records the reason. */
export const decideMoodRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approve", "deny"]),
    family: z.enum(MOOD_FAMILIES).optional(),
    note: z.string().trim().max(300).optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: req, error } = await db.from("mood_requests").select("id, name, status").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("That request is gone.");
    if (req.status !== "pending") throw new Error("That request was already decided.");
    if (data.decision === "approve") {
      const { data: existing } = await db.from("moods").select("id").eq("name", req.name).maybeSingle();
      if (!existing) {
        const { error: insErr } = await db.from("moods").insert({ name: req.name, family: data.family ?? "Modern" });
        if (insErr) throw new Error(insErr.code === "23505" ? "That mood already exists." : insErr.message);
      }
    }
    const { error: upErr } = await db.from("mood_requests").update({
      status: data.decision === "approve" ? "approved" : "denied",
      note: data.note ?? null,
      decided_at: new Date().toISOString(),
      decided_by: context.userId,
    }).eq("id", req.id);
    if (upErr) throw new Error(upErr.message);
    const { error: auditError } = await db.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: data.decision === "approve" ? "mood.request.approve" : "mood.request.deny",
      target: req.name,
    });
    if (auditError) throw new Error(auditError.message);
    return { ok: true };
  });