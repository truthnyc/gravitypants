import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminForStaff } from "../supabase";

export default defineTool({
  name: "admin_client_lookup",
  title: "Admin: look up a client",
  description: "Staff only. Find workspaces by name, id or member email and show plan, billing status and export allowance.",
  inputSchema: { query: z.string().trim().min(2).max(120).describe("Workspace name, workspace id or member email.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }, ctx) => {
    const db = await adminForStaff(ctx, "client_lookup");
    const ids = new Set<string>();
    if (/^[0-9a-f-]{36}$/i.test(query)) ids.add(query);
    const { data: byName } = await db.from("workspaces").select("id").ilike("name", `%${query.replace(/[%_,]/g, "")}%`).limit(10);
    for (const w of byName ?? []) ids.add(w.id);
    if (query.includes("@")) {
      const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
      const u = users?.users?.find((x: { email?: string }) => x.email?.toLowerCase() === query.toLowerCase());
      if (u) {
        const { data: m } = await db.from("workspace_members").select("workspace_id").eq("user_id", u.id);
        for (const r of m ?? []) ids.add(r.workspace_id);
      }
    }
    if (!ids.size) return { content: [{ type: "text", text: "No matching workspaces." }] };
    const list = [...ids].slice(0, 10);
    const [{ data: wss }, { data: bills }] = await Promise.all([
      db.from("workspaces").select("id, name, created_at, suspended_at").in("id", list),
      db.from("workspace_billing").select("workspace_id, plan, status, current_period_end, cancel_at_period_end, extra_exports, referral_credits").in("workspace_id", list),
    ]);
    const rows = await Promise.all((wss ?? []).map(async (w: { id: string; name: string; created_at: string; suspended_at: string | null }) => {
      const b = (bills ?? []).find((x: { workspace_id: string }) => x.workspace_id === w.id);
      const { data: st } = await db.rpc("export_status", { _ws: w.id });
      return { id: w.id, name: w.name, createdAt: w.created_at, suspended: !!w.suspended_at, plan: b?.plan ?? "free", billingStatus: b?.status ?? "none", periodEnd: b?.current_period_end ?? null, cancelAtPeriodEnd: !!b?.cancel_at_period_end, extraExports: b?.extra_exports ?? 0, exportStatus: JSON.stringify(st ?? null) };
    }));
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }], structuredContent: { workspaces: rows } };
  },
});
