import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SHOP_BRAND_QUERY } from "@/lib/shopify/shopify.server";
import { getShopKit, syncShopBranding } from "@/lib/shopify/branding.server";
import { handle, json, listTemplates, shopFromRequest } from "@/lib/shopify/session.server";
import { buildReel, formatPrice, MAX_PRODUCTS, pickPhotos, type PickedProduct, type ReelItem } from "@/lib/shopify/reel-build";
import { copyImage, fetchProducts, gql, insertReel } from "@/lib/shopify/reel.server";
import type { Template } from "@/lib/stillframe/data";

const Body = z.object({ ids: z.array(z.string().regex(/^gid:\/\/shopify\/Product\/\d+$/)).min(1).max(50) });

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

          const products: PickedProduct[] = await fetchProducts(ctx.shop, token, ids);
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
            if (path) items.push({ path, headline: p.product.title, subline: formatPrice(p.product.price), productId: p.product.id });
          }
          if (!items.length) return json({ error: "We couldn't copy these product photos. Please try again." }, 502);

          const templates = await listTemplates(ctx.admin);
          const template = (templates.find((t) => t.is_reusable) ?? templates[0]) as unknown as Template | undefined;
          if (!template) return json({ error: "No templates are available right now." }, 503);

          // Branding is optional: any failure is logged inside and never blocks the reel.
          await syncShopBranding(ctx.admin, ctx.shop, ctx.ws, token, process.env["SHOPIFY_TOKEN_KEY"]!);
          const kit = await getShopKit(ctx.admin, ctx.ws).catch(() => null);
          const reel = buildReel(template, items, { shopName, workspaceId: ctx.ws, name: products[0]?.title ?? "Shopify reel", logoPath: kit?.logo_url ?? null });
          const projectId = await insertReel(ctx.admin, ctx.ws, reel);
          const skipped = products.filter((p) => !p.images.length).map((p) => p.title);
          return json({ projectId, skipped, trimmed: parsed.data.ids.length > MAX_PRODUCTS });
        }),
    },
  },
});
