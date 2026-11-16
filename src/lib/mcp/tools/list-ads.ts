import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_ads",
  title: "List workspace ads",
  description: "Read non-deleted ads in an accessible workspace, newest first, with optional name search and pagination.",
  inputSchema: { workspace_id: z.string().uuid().describe("Workspace ID returned by list_workspaces."), query: z.string().max(200).optional().describe("Optional ad name search."), offset: z.number().int().min(0).max(10000).default(0).describe("Pagination offset."), limit: z.number().int().min(1).max(50).default(20).describe("Maximum ads to return.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false, untrustedContentHint: true },
  handler: async ({ workspace_id, query, offset, limit }, ctx) => {
    let request = supabaseForUser(ctx).from("projects").select("id, name, primary_format, formats, updated_at").eq("workspace_id", workspace_id).is("deleted_at", null).order("updated_at", { ascending: false }).range(offset, offset + limit - 1);
    if (query) request = request.ilike("name", `%${query.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error } = await request;
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    return { content: [{ type: "text", text: data?.map(p => `${p.id}: ${p.name} · ${p.primary_format} · updated ${p.updated_at}`).join("\n") || "No matching accessible ads." }] };
  },
});