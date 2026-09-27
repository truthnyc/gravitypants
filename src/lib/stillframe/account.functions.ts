import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deletes the caller's owned workspaces (rows + files) and their account. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: owned } = await supabaseAdmin.from("workspaces").select("id").eq("owner_id", uid);
    const store = supabaseAdmin.storage.from("media");

    async function removeTree(prefix: string) {
      const { data } = await store.list(prefix, { limit: 1000 });
      const files: string[] = [];
      for (const item of data ?? []) {
        const p = `${prefix}/${item.name}`;
        if (item.id) files.push(p);
        else await removeTree(p);
      }
      if (files.length) await store.remove(files);
    }

    for (const w of owned ?? []) {
      await removeTree(w.id);
      await supabaseAdmin.from("projects").delete().eq("workspace_id", w.id);
      await supabaseAdmin.from("assets").delete().eq("workspace_id", w.id);
      await supabaseAdmin.from("brand_kit").delete().eq("workspace_id", w.id);
      await supabaseAdmin.from("workspaces").delete().eq("id", w.id);
    }
    await supabaseAdmin.from("workspace_members").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("user_id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error("Could not delete the account");
    return { ok: true };
  });
