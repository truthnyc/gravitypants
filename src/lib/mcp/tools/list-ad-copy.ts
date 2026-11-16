import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Txt = { text?: string } | null;
export default defineTool({
  name: "list_ad_copy",
  title: "Read ad copy",
  description: "Read each frame's headline and subline for an ad you can access, with frame ids for editing.",
  inputSchema: { ad_id: z.string().uuid().describe("Ad ID from list_ads.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ad_id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("frames").select("id, sort_order, headline, subline").eq("project_id", ad_id).order("sort_order");
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    const frames = (data ?? []).map(f => ({ frame_id: f.id, position: f.sort_order + 1, headline: (f.headline as Txt)?.text ?? "", subline: (f.subline as Txt)?.text ?? "" }));
    return { content: [{ type: "text", text: frames.length ? JSON.stringify(frames, null, 2) : "No frames found, or you cannot access this ad." }], structuredContent: { frames } };
  },
});
