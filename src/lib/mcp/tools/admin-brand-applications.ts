import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { adminForStaff } from "../supabase";

export default defineTool({
  name: "admin_brand_applications",
  title: "Admin: brand applications and reel updates",
  description: "Staff only. List brand applications awaiting review and live reel video replacements awaiting approval.",
  inputSchema: { limit: z.number().int().min(1).max(50).default(25) },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const db = await adminForStaff(ctx, "brand_applications");
    const [apps, reels] = await Promise.all([
      db.from("brand_requests").select("id, created_at, status, brand, website, category, moods, name, email, description").in("status", ["pending", "needs_info"]).order("created_at").limit(limit),
      db.from("directory_reels").select("id, title, pending_status, pending_note, pending_submitted_at").eq("pending_status", "pending").order("pending_submitted_at").limit(limit),
    ]);
    if (apps.error) return { isError: true, content: [{ type: "text", text: apps.error.message }] };
    const o = {
      applications: (apps.data ?? []).map((a: Record<string, unknown>) => ({ ...a, description: String(a["description"] ?? "").slice(0, 300) })),
      reelUpdates: reels.data ?? [],
    };
    return { content: [{ type: "text", text: JSON.stringify(o, null, 2) }], structuredContent: JSON.parse(JSON.stringify(o)) };
  },
});
