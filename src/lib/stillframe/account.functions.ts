import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deletes one of the caller's own exports: files plus the usage record, so the export is given back. */
export const deleteMyExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid(), projectId: z.string().uuid(), stamp: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", data.workspaceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!member) throw new Error("You can only delete exports from your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = supabaseAdmin.storage.from("media");
    const dir = `${data.workspaceId}/exports/${data.projectId}/${data.stamp}`;
    const { data: files } = await store.list(dir, { limit: 1000 });
    const paths = (files ?? []).filter((f) => f.id).map((f) => `${dir}/${f.name}`);
    if (paths.length) await store.remove(paths);
    await supabaseAdmin.from("export_usage").delete().eq("workspace_id", data.workspaceId).eq("stamp", data.stamp);
    await supabaseAdmin.from("exports").delete().eq("workspace_id", data.workspaceId).eq("stamp", data.stamp);
    return { ok: true };
  });

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
