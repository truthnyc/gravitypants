import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { formatGB, storageAlertAction, storageLimitFor } from "@/lib/stillframe/storage-limits";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Daily: emails each workspace owner once when storage reaches 80% of their plan's limit. */
export const Route = createFileRoute("/api/public/jobs/storage-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const db = supabaseAdmin as any;
        const [{ data: usage }, { data: alerts }] = await Promise.all([
          db.rpc("admin_storage_by_workspace"),
          db.from("storage_alerts").select("workspace_id"),
        ]);
        const alerted = new Set(((alerts ?? []) as any[]).map((a) => a.workspace_id));
        const uuid = /^[0-9a-f-]{36}$/i;
        let sent = 0;
        for (const row of (usage ?? []) as { workspace_id: string; bytes: number }[]) {
          if (!uuid.test(row.workspace_id)) continue;
          const used = Number(row.bytes);
          const { data: plan } = await db.rpc("directory_effective_plan", { _ws: row.workspace_id });
          const { data: src } = await db.rpc("billing_source", { _ws: row.workspace_id });
          const { data: wb } = await db.from("workspace_billing").select("storage_addon_units").eq("workspace_id", src ?? row.workspace_id).maybeSingle();
          const limit = storageLimitFor(plan, wb?.storage_addon_units ?? 0);
          const action = storageAlertAction(used, limit, alerted.has(row.workspace_id));
          if (action === "reset") await db.from("storage_alerts").delete().eq("workspace_id", row.workspace_id);
          if (action !== "send") continue;
          const { data: ws } = await db.from("workspaces").select("name, owner_id").eq("id", row.workspace_id).maybeSingle();
          if (!ws?.owner_id) continue;
          const { data: u } = await db.auth.admin.getUserById(ws.owner_id);
          const email = u?.user?.email;
          if (!email) continue;
          try {
            await sendTemplateEmail("storage-warning", email, {
              templateData: { workspaceName: ws.name, used: formatGB(used), limit: formatGB(limit), percent: Math.min(100, Math.floor((used / limit) * 100)) },
              idempotencyKey: `storage-warning-${row.workspace_id}-${new Date().toISOString().slice(0, 10)}`,
            });
            await db.from("storage_alerts").upsert({ workspace_id: row.workspace_id, used_bytes: used, limit_bytes: limit, alerted_at: new Date().toISOString() });
            sent++;
          } catch (e) { console.error("storage warning failed", row.workspace_id, e); }
        }
        return Response.json({ sent });
      },
    },
  },
});
