import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { moodInput } from "./mood-admin";

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
    const { data, error } = await db.from("moods").select("id,name,family,sort_order").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAdminMood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => moodInput.parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const fields = { name: data.name, family: data.family };
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