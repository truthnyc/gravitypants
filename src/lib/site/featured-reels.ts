import type { SiteReel } from "./reels";

/** Directory formats ("9x16") to site reel formats ("916"). */
export const DIR_FORMAT: Record<string, SiteReel["format"]> = { "9x16": "916", "1x1": "11", "16x9": "169" };

export type FeaturedDirRow = {
  id: string; title: string | null; display_title: string | null; description: string | null;
  formats: string[] | null; created_at: string; showcase_order: number | null;
  brand: { id: string; name: string; slug: string; category: string; website_url: string | null };
  video: string | null; poster: string | null; seconds: number; photos: number;
};

/** Maps a featured Directory reel to a SiteReel; null when it has no playable video. */
export function directoryToSiteReel(r: FeaturedDirRow): SiteReel | null {
  if (!r.video) return null;
  return {
    id: r.id,
    brand: r.brand.name,
    brandSlug: r.brand.slug,
    title: r.display_title?.trim() || r.title?.trim() || r.brand.name,
    displayTitle: r.display_title ?? null,
    description: r.description ?? undefined,
    href: r.brand.website_url,
    category: r.brand.category as SiteReel["category"],
    format: DIR_FORMAT[r.formats?.[0] ?? ""] ?? "916",
    seconds: r.seconds,
    photos: r.photos,
    video: r.video,
    videoWebm: null,
    poster: r.poster,
    source: "client",
  };
}

/** Merges studio and client reels: by sort_order / showcase_order, then created date. */
export function mergeShowcase(
  studio: { reel: SiteReel; order: number; created: string }[],
  client: { reel: SiteReel; order: number; created: string }[],
): SiteReel[] {
  return [...studio, ...client]
    .sort((a, b) => a.order - b.order || a.created.localeCompare(b.created))
    .map((x) => x.reel);
}

/** Validates a feature/unfeature request and returns the row patch. Throws for non-admins and non-live reels. */
export function featurePatch(o: { isAdmin: boolean; featured: boolean; status: string | null; maxOrder: number; adminId: string; now: string }) {
  if (!o.isAdmin) throw new Error("Not found");
  if (!o.status) throw new Error("Not found");
  if (!o.featured) return { in_showcase: false, showcase_order: null, showcase_at: null, showcase_by: null };
  if (o.status !== "live") throw new Error("Only live reels can be featured.");
  return { in_showcase: true, showcase_order: o.maxOrder + 10, showcase_at: o.now, showcase_by: o.adminId };
}

/** A featured row stays listed only while live, featured, with a video and a brand still visible (plan or grace). */
export function showcaseEligible(r: { in_showcase: boolean; status: string; video_url: string | null; brand_id: string }, visibleBrands: Set<string>): boolean {
  return r.in_showcase && r.status === "live" && !!r.video_url && visibleBrands.has(r.brand_id);
}
