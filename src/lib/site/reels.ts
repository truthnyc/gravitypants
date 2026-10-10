import { CATEGORIES, normalizeCategory } from "@/lib/directory/directory";

export type ReelFormat = "916" | "11" | "169";
/** Website reels use the shared brand categories; older values remain readable. */
export type ReelCategory = string;
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c, c]));
export const categoryLabel = (c: string) => normalizeCategory(c) ?? c.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/** A brand reel managed from /admin/reels; drives home, Examples and Showcase. */
export type SiteReel = {
  id: string;
  brand: string;
  /** Slug of the matching Directory brand page (/directory/<slug>), when one exists. */
  brandSlug: string | null;
  title: string;
  /** Title shown on Aimanté instead of the template-style title; empty means the brand name. */
  displayTitle?: string | null;
  description?: string;
  href: string | null;
  category: ReelCategory;
  format: ReelFormat;
  seconds: number;
  photos: number;
  video: string;
  videoWebm: string | null;
  poster: string | null;
  /** "studio" = admin-uploaded site reel; "client" = featured Directory reel. Missing means studio. */
  source?: "studio" | "client";
};

/** Files uploaded from the admin form are stored as `site-reels:<path>`. */
export const REEL_PREFIX = "site-reels:";
export const FORMAT_LABEL: Record<ReelFormat, string> = { "916": "9:16", "11": "1:1", "169": "16:9" };

/** Aimanté reel title: the set display title, otherwise the brand name — never the template name. */
export const aimanteTitle = (r: { displayTitle?: string | null; title?: string | null; brand: string }) => r.displayTitle?.trim() || r.title?.trim() || r.brand;
