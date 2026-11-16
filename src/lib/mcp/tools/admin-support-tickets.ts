import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminForStaff } from "../supabase";

export default defineTool({
  name: "admin_support_tickets",
  title: "Admin: support tickets",
  description: "Staff only. List recent support tickets with status, priority, topic, workspace and message excerpt.",
  inputSchema: {
    status: z.enum(["open", "resolved", "all"]).default("open").describe("Open means anything not resolved."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    const db = await adminForStaff(ctx, "support_tickets");
    let q = db.from("support_tickets").select("id, created_at, status, priority, topic, message, workspace_id, workspaces(name)").order("created_at", { ascending: false }).limit(limit);
    if (status === "open") q = q.neq("status", "resolved");
    if (status === "resolved") q = q.eq("status", "resolved");
    const { data, error } = await q;
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    const rows = (data ?? []).map((t: { id: string; created_at: string; status: string; priority: string; topic: string; message: string; workspace_id: string; workspaces: { name: string } | null }) => ({
      id: t.id, createdAt: t.created_at, status: t.status, priority: t.priority, topic: t.topic, workspace: t.workspaces?.name ?? t.workspace_id, message: t.message.slice(0, 400),
    }));
    return { content: [{ type: "text", text: rows.length ? JSON.stringify(rows, null, 2) : "No tickets." }], structuredContent: { tickets: rows } };
  },
});
