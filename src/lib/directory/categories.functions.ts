import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { categoryHintInput } from "./admin-fields";

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data, error } = await publicClient().from("categories").select("id,name,slug,hint,page_intro,sort_order").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const saveCategoryHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => categoryHintInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("is_platform_admin");
    if (roleError || admin !== true) throw new Error("Not authorized");
    const { data: row, error } = await context.supabase.from("categories").update({ hint: data.hint, ...(data.page_intro !== undefined ? { page_intro: data.page_intro } : {}) }).eq("id", data.id).select("name").single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({ admin_user_id: context.userId, action: "category.hint.update", target: row.name });
    if (auditError) throw new Error(auditError.message);
    return { ok: true };
  });
/** Public: the name and editable intro shown under a /c/ or /mood/ page heading. */
export const getListingIntro = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["category", "mood"]), slug: z.string().trim().toLowerCase().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const { publicClient } = await import("@/lib/site/reels.server");
    const pc = publicClient() as any;
    const { data: row } = data.kind === "category"
      ? await pc.from("categories").select("name, page_intro").eq("slug", data.slug).maybeSingle()
      : await pc.from("moods").select("name, page_intro").ilike("name", data.slug).maybeSingle();
    return row ? { name: row.name as string, intro: (row.page_intro as string) || "" } : null;
  });
