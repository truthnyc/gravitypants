import type { SiteReel } from "./reels";
import { LAUNCH_FILM } from "./launch-film";

/** Watch pages: one /reels/<slug> page per public reel, the only place its video markup lives. */
export const reelName = (r: Pick<SiteReel, "brand" | "displayTitle" | "title">) => `${r.brand} — ${r.displayTitle?.trim() || r.title} video ad`;

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

/** Slug per reel id from brand + title. Pass the full public list so every page agrees; repeats get a short id suffix. */
export function watchSlugs(reels: SiteReel[]): Map<string, string> {
  const base = new Map(reels.map((r) => [r.id, slugify(`${r.brand} ${r.displayTitle?.trim() || r.title}`) || slugify(r.id)]));
  const count = new Map<string, number>();
  for (const s of base.values()) count.set(s, (count.get(s) ?? 0) + 1);
  return new Map([...base].map(([id, s]) => [id, (count.get(s) ?? 0) > 1 ? `${s}-${slugify(id).slice(0, 6)}` : s]));
}

export const watchPath = (slug: string) => `/reels/${slug}`;

/** Pixel size for OG video tags, from the reel's stored shape. */
export const FORMAT_SIZE: Record<SiteReel["format"], { width: number; height: number; label: string }> = {
  "916": { width: 1080, height: 1920, label: "Vertical 9:16" },
  "45": { width: 1080, height: 1350, label: "Portrait 4:5" },
  "11": { width: 1080, height: 1080, label: "Square 1:1" },
  "54": { width: 1350, height: 1080, label: "Landscape 5:4" },
  "169": { width: 1920, height: 1080, label: "Wide 16:9" },
};

/** Up to `n` other reels, same category first, then the rest in list order. */
export function relatedReels(reel: SiteReel, all: SiteReel[], n = 4): SiteReel[] {
  const others = all.filter((r) => r.id !== reel.id);
  return [...others.filter((r) => r.category === reel.category), ...others.filter((r) => r.category !== reel.category)].slice(0, n);
}

/** Slugs for the public reel list plus the launch film — the exact set /reels pages use. */
export const siteWatchSlugs = (reels: SiteReel[]) => watchSlugs([...reels, LAUNCH_FILM]);
