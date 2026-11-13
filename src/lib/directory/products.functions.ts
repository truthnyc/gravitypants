import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REEL_PRODUCTS_MAX, isHttpsUrl, type ReelProduct } from "./products";

/* eslint-disable @typescript-eslint/no-explicit-any */

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  }) as any;
}

const COLS = "id, reel_id, name, price, currency, url, image_path, image_url, position, source_type, availability, last_synced_at, sync_failures";

/** Public: products on live reels (empty for reels without any). */
export const getReelProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ reelIds: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.reelIds.length) return [] as ReelProduct[];
    const { data: rows } = await publicClient().from("reel_products").select(COLS).in("reel_id", data.reelIds).neq("availability", "out_of_stock").order("position");
    return (rows ?? []) as ReelProduct[];
  });

/** Public: products across a brand's live reels. */
export const getBrandProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: reels } = await sb.from("directory_reels").select("id").eq("brand_id", data.brandId).eq("status", "live");
    const ids = (reels ?? []).map((r: any) => r.id);
    if (!ids.length) return [] as ReelProduct[];
    const { data: rows } = await sb.from("reel_products").select(COLS).in("reel_id", ids).neq("availability", "out_of_stock").order("position");
    return (rows ?? []) as ReelProduct[];
  });

/** Public: records one click; only for products visible on a live reel. No personal data. */
export const recordProductClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: p } = await publicClient().from("reel_products").select("id, reel_id").eq("id", data.productId).maybeSingle();
    if (!p) return { recorded: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("product_clicks").insert({ product_id: p.id, reel_id: p.reel_id });
    return { recorded: true };
  });

async function reelForAd(sb: any, adId: string) {
  const { data: reel } = await sb.from("directory_reels").select("id").eq("ad_id", adId).maybeSingle();
  if (!reel) throw new Error("This reel isn't in the Directory.");
  return reel.id as string;
}

/** Brand owner: products on their reel, with click counts. RLS limits this to the reel's brand. */
export const getMyReelProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const reelId = await reelForAd(sb, data.adId);
    const { data: rows } = await sb.from("reel_products").select(COLS).eq("reel_id", reelId).order("position");
    const products = (rows ?? []) as ReelProduct[];
    const clicks: Record<string, number> = {};
    if (products.length) {
      const { data: c } = await sb.from("product_clicks").select("product_id").in("product_id", products.map((p) => p.id));
      for (const r of c ?? []) clicks[r.product_id] = (clicks[r.product_id] ?? 0) + 1;
    }
    return { reelId, products, clicks };
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  price: z.number().min(0).max(1e9).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  url: z.string().trim().max(2000).refine(isHttpsUrl, "Use a link that starts with https://"),
  image_path: z.string().trim().max(2000).refine(isHttpsUrl, "Image link must start with https://").nullable(),
  image_url: z.string().trim().max(2000).refine(isHttpsUrl).nullable().optional(),
  source_type: z.enum(["manual", "link"]).default("manual"),
  availability: z.enum(["in_stock", "out_of_stock", "unknown"]).optional(),
});

/** Brand owner: replaces the reel's product list in the given order. Kept rows keep their click history. */
export const saveMyReelProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid(), products: z.array(productInput).max(REEL_PRODUCTS_MAX) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const reelId = await reelForAd(sb, data.adId);
    const { data: existing } = await sb.from("reel_products").select("id").eq("reel_id", reelId);
    const keep = new Set(data.products.map((p) => p.id).filter(Boolean));
    const drop = (existing ?? []).map((r: any) => r.id).filter((id: string) => !keep.has(id));
    if (drop.length) { const { error } = await sb.from("reel_products").delete().in("id", drop); if (error) throw new Error(error.message); }
    for (const [i, p] of data.products.entries()) {
      const row: Record<string, unknown> = { reel_id: reelId, name: p.name, price: p.price, currency: p.currency, url: p.url, image_path: p.image_path, position: i };
      const isNew = !(p.id && (existing ?? []).some((r: any) => r.id === p.id));
      // Source is fixed when a row is created, so hand-entered products are never picked up by the nightly sync.
      if (isNew) Object.assign(row, { source_type: p.source_type, image_url: p.source_type === "link" ? p.image_url ?? null : null, availability: p.availability ?? "unknown", last_synced_at: p.source_type === "link" ? new Date().toISOString() : null });
      const { error } = !isNew
        ? await sb.from("reel_products").update(row).eq("id", p.id).eq("reel_id", reelId)
        : await sb.from("reel_products").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Brand owner or admin: reads name, price, image and stock from a product page. Saves nothing. */
export const fetchProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid(), url: z.string().trim().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: reel } = await sb.from("directory_reels").select("brand_id").eq("ad_id", data.adId).maybeSingle();
    if (!reel) throw new Error("This reel isn't in the Directory.");
    const [{ data: member }, { data: admin }] = await Promise.all([sb.rpc("is_brand_member", { _brand: reel.brand_id }), sb.rpc("is_platform_admin")]);
    if (member !== true && admin !== true) throw new Error("Only this brand can add products.");
    const { fetchProductInfo, ProductFetchError } = await import("./product-fetch.server");
    const { hasProductData } = await import("./product-page");
    try {
      const info = await fetchProductInfo(data.url);
      return { ok: true as const, found: hasProductData(info), product: info };
    } catch (e) {
      return { ok: false as const, error: e instanceof ProductFetchError ? e.message : "We couldn't reach that page." };
    }
  });
