import { defineTool } from "@lovable.dev/mcp-js";
import { adminForStaff } from "../supabase";

export default defineTool({
  name: "admin_overview",
  title: "Admin: platform overview",
  description: "Staff only. Platform totals: workspaces, paid plans, 30-day exports, recent workspaces, pending brand applications and open support tickets.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const db = await adminForStaff(ctx, "overview");
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const head = { count: "exact" as const, head: true };
    const [ws, newWs, exp, paid, apps, tickets] = await Promise.all([
      db.from("workspaces").select("id", head),
      db.from("workspaces").select("id", head).gte("created_at", since),
      db.from("export_usage").select("id", head).gte("created_at", since),
      db.from("workspace_billing").select("plan").in("status", ["active", "trialing", "past_due"]),
      db.from("brand_requests").select("id", head).in("status", ["pending", "needs_info"]),
      db.from("support_tickets").select("id", head).neq("status", "resolved"),
    ]);
    const plans: Record<string, number> = {};
    for (const r of (paid.data ?? []) as { plan: string }[]) if (r.plan !== "free") plans[r.plan] = (plans[r.plan] ?? 0) + 1;
    const o = { workspaces: ws.count ?? 0, newWorkspaces30d: newWs.count ?? 0, exports30d: exp.count ?? 0, paidPlans: plans, pendingBrandApplications: apps.count ?? 0, openSupportTickets: tickets.count ?? 0 };
    return { content: [{ type: "text", text: JSON.stringify(o, null, 2) }], structuredContent: o };
  },
});
