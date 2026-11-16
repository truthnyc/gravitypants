import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_reel_products",
  title: "List reel products",
  description: "List products attached to reels you can see, with ids and stock status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_a, ctx) => {
    const { data, error } = await supabaseForUser(ctx).from("reel_products").select("id, name, price, currency, availability, reel_id, site_reel_id").order("created_at", { ascending: false }).limit(200);
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };
    const products = (data ?? []).map(p => ({ id: p.id, name: p.name, price: p.price, currency: p.currency, availability: p.availability, reel: p.reel_id ?? p.site_reel_id }));
    return { content: [{ type: "text", text: products.length ? JSON.stringify(products, null, 2) : "No products." }], structuredContent: { products } };
  },
});
