import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_product_status",
  title: "Set product stock status",
  description: "Set a reel product to in stock, out of stock or unknown. Works for the brand's own members and staff. Sold-out products are hidden from shoppers.",
  inputSchema: {
    product_id: z.string().uuid(),
    availability: z.enum(["in_stock", "out_of_stock", "unknown"]),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_id, availability }, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("reel_products").update({ availability }).eq("id", product_id).select("name");
    if (error || !data?.length) return { isError: true, content: [{ type: "text", text: error?.message ?? "Product not found or you cannot edit it." }] };
    return { content: [{ type: "text", text: `${data[0]!.name} is now ${availability.replace("_", " ")}.` }] };
  },
});
