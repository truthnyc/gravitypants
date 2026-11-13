import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isHttpsUrl } from "./products";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function assertBrandAccess(sb: any, brandId: string) {
  const [{ data: member }, { data: admin }] = await Promise.all([sb.rpc("is_brand_member", { _brand: brandId }), sb.rpc("is_platform_admin")]);
  if (member !== true && admin !== true) throw new Error("Only this brand can manage its catalogue.");
}

const feedUrl = z.string().trim().max(2000).refine(isHttpsUrl, "Use a feed address that starts with https://");

/** The brand's feed state (RLS: owning brand and admins only). */
export const getMyFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: src } = await (context.supabase as any).from("brand_sources").select("id, feed_url, status, last_synced_at, last_error, product_count").eq("brand_id", data.brandId).maybeSingle();
    return { source: src as null | { id: string; feed_url: string; status: "ok" | "error" | "syncing"; last_synced_at: string | null; last_error: string | null; product_count: number } };
  });

/** Reads the first five products from a feed without saving. */
export const testFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid(), url: feedUrl }).parse(d))
  .handler(async ({ data, context }) => {
    await assertBrandAccess(context.supabase, data.brandId);
    const { readFeed } = await import("./feed-sync.server");
    try {
      const items = await readFeed(data.url);
      return { ok: true as const, total: items.length, items: items.slice(0, 5) };
    } catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "We couldn't read this feed." }; }
  });

/** Saves the feed address (one per brand) and syncs it now. */
export const saveFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid(), url: feedUrl }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertBrandAccess(sb, data.brandId);
    const { data: src, error } = await sb.from("brand_sources").upsert({ brand_id: data.brandId, feed_url: data.url, type: "feed" }, { onConflict: "brand_id" }).select("id").single();
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncSource } = await import("./feed-sync.server");
    return syncSource(supabaseAdmin, src.id);
  });

/** "Sync now" for the brand's own feed. */
export const syncMyFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertBrandAccess(sb, data.brandId);
    const { data: src } = await sb.from("brand_sources").select("id").eq("brand_id", data.brandId).maybeSingle();
    if (!src) throw new Error("No feed connected.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncSource } = await import("./feed-sync.server");
    return syncSource(supabaseAdmin, src.id);
  });

/** Removes the feed and catalogue; products already on reels stay and become hand-entered. */
export const disconnectFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertBrandAccess(sb, data.brandId);
    const { data: src } = await sb.from("brand_sources").select("id").eq("brand_id", data.brandId).maybeSingle();
    if (!src) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: cat } = await db.from("brand_catalog").select("id").eq("source_id", src.id);
    const ids = (cat ?? []).map((c: any) => c.id);
    for (let i = 0; i < ids.length; i += 500) {
      await db.from("reel_products").update({ source_type: "manual", catalog_id: null }).in("catalog_id", ids.slice(i, i + 500));
    }
    const { error } = await db.from("brand_sources").delete().eq("id", src.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Searchable catalogue list for the reel's brand (RLS keeps it to that brand). */
export const searchMyCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ adId: z.string().uuid(), q: z.string().max(100).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: reel } = await sb.from("directory_reels").select("brand_id").eq("ad_id", data.adId).maybeSingle();
    if (!reel) return { hasCatalog: false, items: [] as any[] };
    await assertBrandAccess(sb, reel.brand_id);
    const { count } = await sb.from("brand_catalog").select("id", { count: "exact", head: true }).eq("brand_id", reel.brand_id);
    if (!count) return { hasCatalog: false, items: [] as any[] };
    let q = sb.from("brand_catalog").select("id, name, price, currency, url, image_url, availability").eq("brand_id", reel.brand_id).order("name").limit(50);
    const term = data.q.trim().replace(/[%_,()]/g, " ").trim();
    if (term) q = q.ilike("name", `%${term}%`);
    const { data: items } = await q;
    return { hasCatalog: true, items: (items ?? []) as { id: string; name: string; price: number | null; currency: string; url: string; image_url: string | null; availability: "in_stock" | "out_of_stock" | "unknown" }[] };
  });
