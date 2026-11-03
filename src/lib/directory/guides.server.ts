/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GuideSummary } from "./guides";

export type GuideBrandCard = { id: string; name: string; slug: string; category: string; why: string; poster: string | null };

const LOGO_PREFIX = "brand-assets:";

/** One thumbnail per brand: its website reel poster, else a live Directory reel poster, else its logo. */
export async function brandThumbs(brands: { id: string; slug: string; logo_url: string | null }[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!brands.length) return out;
  const { publicClient } = await import("@/lib/site/reels.server");
  const { listSiteReels } = await import("@/lib/site/reels.functions");
  const { toCards } = await import("./directory.server");
  const site = (await listSiteReels().catch(() => [])).filter((r) => r.source !== "client");
  const need = brands.filter((b) => !site.find((r) => r.brandSlug === b.slug && r.poster));
  let cards: { brand_slug: string; poster: string | null }[] = [];
  if (need.length) {
    const { data } = await (publicClient() as any).rpc("search_directory", { q: "", size: null });
    const seen = new Set<string>();
    const rows = ((data ?? []) as any[]).filter((r) => need.some((b) => b.slug === r.brand_slug) && !seen.has(r.brand_slug) && seen.add(r.brand_slug));
    cards = await toCards(rows).catch(() => []);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (const b of brands) {
    let poster = site.find((r) => r.brandSlug === b.slug && r.poster)?.poster ?? cards.find((c) => c.brand_slug === b.slug)?.poster ?? null;
    if (!poster && b.logo_url) {
      if (b.logo_url.startsWith(LOGO_PREFIX)) poster = (await supabaseAdmin.storage.from("brand-assets").createSignedUrl(b.logo_url.slice(LOGO_PREFIX.length), 86_400)).data?.signedUrl ?? null;
      else if (b.logo_url.startsWith("https://")) poster = b.logo_url;
    }
    out.set(b.id, poster);
  }
  return out;
}

/** Published guides, newest first, each with a cover (stored, else its first featured brand's thumbnail). */
export async function publishedGuides(): Promise<(GuideSummary & { firstBrand: string | null })[]> {
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data, error } = await (publicClient() as any).from("guides").select("slug, title, intro, cover_image, moods, categories, season, sections, updated_at").eq("status", "published").order("updated_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return ((data ?? []) as any[]).map((g) => ({
    slug: g.slug, title: g.title, intro: g.intro, cover: g.cover_image ?? null, moods: g.moods ?? [], categories: g.categories ?? [], season: g.season ?? null, updated_at: g.updated_at,
    firstBrand: (g.sections ?? [])[0]?.brands?.[0]?.id ?? null,
  }));
}

/** Fill missing covers from the first featured brand. */
export async function withCovers<T extends { cover: string | null; firstBrand: string | null }>(guides: T[]): Promise<T[]> {
  const ids = [...new Set(guides.filter((g) => !g.cover && g.firstBrand).map((g) => g.firstBrand!))];
  if (!ids.length) return guides;
  const { publicClient } = await import("@/lib/site/reels.server");
  const { data } = await (publicClient() as any).from("directory_brands").select("id, slug, logo_url").in("id", ids).eq("status", "live");
  const thumbs = await brandThumbs((data ?? []) as any[]);
  return guides.map((g) => (g.cover || !g.firstBrand ? g : { ...g, cover: thumbs.get(g.firstBrand) ?? null }));
}
