/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DirectoryCard } from "./directory";

export type FavBrand = { id: string; name: string; slug: string; category: string; logo: string | null };

/** A person's saved reels and brands, limited to what is public in the Directory right now. */
export async function loadFavorites(userId: string): Promise<{ reels: DirectoryCard[]; brands: FavBrand[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { toCards } = await import("./directory.server");
  const sb = supabaseAdmin as any;
  const [{ data: rf }, { data: bf }] = await Promise.all([
    sb.from("directory_reel_favorites").select("reel_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("directory_favorites").select("brand_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const reelIds = (rf ?? []).map((r: any) => r.reel_id);
  const brandIds = (bf ?? []).map((r: any) => r.brand_id);
  const { data: reels } = reelIds.length
    ? await sb.from("directory_reels").select("id, tags, moods, formats, brand_id, templates(name), directory_brands(name, slug, category)").in("id", reelIds).eq("status", "live")
    : { data: [] };
  const { data: brands } = brandIds.length
    ? await sb.from("directory_brands").select("id, name, slug, category, logo_url").in("id", brandIds)
    : { data: [] };
  const all = new Set<string>([...(reels ?? []).map((r: any) => r.brand_id), ...(brands ?? []).map((b: any) => b.id)]);
  const visible = new Set<string>();
  await Promise.all([...all].map(async (id) => {
    const { data } = await sb.rpc("brand_visible", { _brand: id });
    if (data) visible.add(id);
  }));
  const order = new Map<string, number>(reelIds.map((id: string, i: number) => [id, i]));
  const okReels = ((reels ?? []) as any[]).filter((r) => visible.has(r.brand_id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const cards = await toCards(okReels.map((r) => ({
    id: r.id, brand_name: r.directory_brands?.name, brand_slug: r.directory_brands?.slug, category: r.directory_brands?.category,
    tags: r.tags, moods: r.moods, formats: r.formats, template_name: r.templates?.name ?? null,
  })));
  const bOrder = new Map<string, number>(brandIds.map((id: string, i: number) => [id, i]));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { createSignedUrl } = (supabaseAdmin as any).storage.from("brand-assets");
  const okBrands = ((brands ?? []) as any[]).filter((b) => visible.has(b.id)).sort((a, b) => (bOrder.get(a.id) ?? 0) - (bOrder.get(b.id) ?? 0));
  const signedLogos = new Map<string, string>();
  await Promise.all(okBrands.map(async (b) => {
    const url: string | null = b.logo_url ?? null;
    if (url?.startsWith("brand-assets:")) {
      const { data } = await createSignedUrl(url.slice("brand-assets:".length), 60 * 60 * 24);
      if (data?.signedUrl) signedLogos.set(b.id, data.signedUrl);
    } else if (url?.startsWith("https://")) {
      signedLogos.set(b.id, url);
    }
  }));
  return { reels: cards, brands: okBrands.map((b) => ({ id: b.id, name: b.name, slug: b.slug, category: b.category, logo: signedLogos.get(b.id) ?? null })) };
}
