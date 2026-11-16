import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_workspaces",
  title: "List your workspaces",
  description: "List accessible Gravity Pants workspaces to select an account for reading ads.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("workspaces").select("id, name").order("name").limit(100);
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    return { content: [{ type: "text", text: data?.map(w => `${w.id}: ${w.name}`).join("\n") || "No accessible workspaces." }] };
  },
});