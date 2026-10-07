import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { categoryHintInput } from "./admin-fields";

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data, error } = await publicClient().from("categories").select("id,name,slug,hint,sort_order").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const saveCategoryHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categoryHintInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("is_platform_admin");
    if (roleError || admin !== true) throw new Error("Not authorized");
    const { data: row, error } = await context.supabase.from("categories").update({ hint: data.hint }).eq("id", data.id).select("name").single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "category.hint.update", target: row.name });
    if (auditError) throw new Error(auditError.message);
    return { ok: true };
  });