import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_ad_copy",
  title: "Edit ad copy",
  description: "Change the headline and/or subline text of one frame in an ad you can edit. Styling is kept. Use list_ad_copy first.",
  inputSchema: {
    frame_id: z.string().uuid(),
    headline: z.string().max(200).optional().describe("New headline text."),
    subline: z.string().max(300).optional().describe("New subline text."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ frame_id, headline, subline }, ctx) => {
    if (headline === undefined && subline === undefined) return { isError: true, content: [{ type: "text", text: "Give a headline or subline." }] };
    const db = supabaseForUser(ctx);
    const { data: f, error } = await db.from("frames").select("headline, subline").eq("id", frame_id).maybeSingle();
    if (error || !f) return { isError: true, content: [{ type: "text", text: "Frame not found or not accessible." }] };
    const patch: { headline?: Record<string, unknown>; subline?: Record<string, unknown> } = {};
    if (headline !== undefined) patch.headline = { ...((f.headline as Record<string, unknown>) ?? {}), text: headline };
    if (subline !== undefined) patch.subline = { ...((f.subline as Record<string, unknown>) ?? {}), text: subline };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error: e2 } = await db.from("frames").update(patch as any).eq("id", frame_id).select("id");
    if (e2 || !saved?.length) return { isError: true, content: [{ type: "text", text: e2?.message ?? "You cannot edit this ad." }] };
    return { content: [{ type: "text", text: "Copy updated." }] };
  },
});
