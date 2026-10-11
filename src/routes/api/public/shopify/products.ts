import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminGraphql, SHOP_BRAND_QUERY } from "@/lib/shopify/shopify.server";
import { handle, json, listTemplates, shopFromRequest } from "@/lib/shopify/session.server";
import { buildReel, formatPrice, MAX_PRODUCTS, pickPhotos, type PickedProduct, type ReelItem } from "@/lib/shopify/reel-build";
import { copyImage, insertReel } from "@/lib/shopify/reel.server";
import type { Template } from "@/lib/stillframe/data";

const PRODUCTS_QUERY = `query PickedProducts($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { id title handle onlineStoreUrl vendor productType priceRangeV2 { minVariantPrice { amount currencyCode } } media(first: 10) { nodes { ... on MediaImage { id alt image { url width height } } } } } } }`;

type Node = {
  id?: string;
  title?: string;
  priceRangeV2?: { minVariantPrice: { amount: string; currencyCode: string } };
  media?: { nodes: { alt?: string | null; image?: { url: string } | null }[] };
} | null;

const Body = z.object({ ids: z.array(z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/)).min(1).max(50) });

async function gql<T>(shop: string, token: string, q: string, v?: unknown) {
  try {
    return await adminGraphql<T>(shop, token, q, v);
  } catch (e) {
    if (!/THROTTLED|429/.test(String(e))) throw e;
    await new Promise((r) => setTimeout(r, 1000));
    return adminGraphql<T>(shop, token, q, v);
  }
}

export const Route = createFileRoute("/api/public/shopify/products")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handle(async () => {
          const ctx = await shopFromRequest(request);
          const parsed = Body.safeParse(await request.json().catch(() => null));
          if (!parsed.success) return json({ error: "Pick at least one product." }, 400);
          const ids = parsed.data.ids.slice(0, MAX_PRODUCTS);
          const token = await ctx.accessToken();

          const data = await gql<{ nodes: Node[] }>(ctx.shop, token, PRODUCTS_QUERY, { ids });
          const products: PickedProduct[] = data.nodes.filter((n): n is NonNullable<Node> => !!n?.id).map((n) => ({
            id: n.id!,
            title: n.title ?? "",
            price: n.priceRangeV2?.minVariantPrice ?? null,
            images: (n.media?.nodes ?? []).filter((m) => m.image?.url).map((m) => ({ url: m.image!.url, alt: m.alt ?? null })),
          }));
          const photos = pickPhotos(products);
          if (!photos.length) return json({ error: "None of these products have photos yet. Add photos in Shopify, then try again." }, 422);

          let shopName = ctx.shop.replace(/\.myshopify\.com$/, "");
          try {
            shopName = (await gql<{ shop: { name: string } }>(ctx.shop, token, SHOP_BRAND_QUERY)).shop.name || shopName;
          } catch (e) {
            console.error("shopify products shop name", e);
          }

          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const items: ReelItem[] = [];
          for (const [i, p] of photos.entries()) {
            const path = await copyImage(ctx.admin, ctx.ws, stamp, i, p.url);
            if (path) items.push({ path, headline: p.product.title, subline: formatPrice(p.product.price) });
          }
          if (!items.length) return json({ error: "We couldn't copy these product photos. Please try again." }, 502);

          const templates = await listTemplates(ctx.admin);
          const template = (templates.find((t) => t.is_reusable) ?? templates[0]) as unknown as Template | undefined;
          if (!template) return json({ error: "No templates are available right now." }, 503);

          const reel = buildReel(template, items, shopName, ctx.ws, products[0]?.title ?? "Shopify reel");
          const projectId = await insertReel(ctx.admin, ctx.ws, reel);
          const skipped = products.filter((p) => !p.images.length).map((p) => p.title);
          return json({ projectId, skipped, trimmed: parsed.data.ids.length > MAX_PRODUCTS });
        }),
    },
  },
});
