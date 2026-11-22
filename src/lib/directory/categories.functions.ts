import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { categoryHintInput } from "./admin-fields";
import { categorySlug } from "./directory";

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data, error } = await publicClient().from("categories").select("id,name,slug,hint,page_intro,sort_order,parent_id,visibility").order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const saveSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), parentId: z.string().uuid(), name: z.string().trim().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("is_platform_admin");
    if (roleError || admin !== true) throw new Error("Not authorized");
    const { data: parent, error: parentError } = await context.supabase.from("categories").select("id,parent_id,visibility").eq("id", data.parentId).single();
    if (parentError || !parent || parent.parent_id !== null || parent.visibility === "retired") throw new Error("Choose an active primary category.");
    const slug = categorySlug(data.name);
    if (!slug) throw new Error("Enter a subcategory name.");
    const query = data.id
      ? context.supabase.from("categories").update({ name: data.name, slug }).eq("id", data.id).eq("parent_id", data.parentId)
      : context.supabase.from("categories").insert({ name: data.name, slug, parent_id: data.parentId, sort_order: 100 });
    const { data: row, error } = await query.select("id,name").single();
    if (error) throw new Error(error.code === "23505" ? "That subcategory name already exists." : error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({ admin_user_id: context.userId, action: data.id ? "subcategory.update" : "subcategory.create", target: row.id });
    if (auditError) throw new Error(auditError.message);
    return { ok: true };
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
      ? await pc.from("categories").select("name, page_intro, meta_description").eq("slug", data.slug).maybeSingle()
      : await pc.from("moods").select("name, page_intro, meta_description").ilike("name", data.slug).maybeSingle();
    return row ? { name: row.name as string, intro: (row.page_intro as string) || "", meta: ((row as { meta_description?: string }).meta_description) || "" } : null;
  });
