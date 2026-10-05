export type ReelFormat = "916" | "11" | "169";
/** Categories are free-text, managed from /admin/reels; known ones get nice labels. */
export type ReelCategory = string;
export const CATEGORY_LABEL: Record<string, string> = { fashion: "Fashion", food: "Food & drink", beauty: "Beauty", home: "Home" };
export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/** A brand reel managed from /admin/reels; drives home, Examples and Showcase. */
export type SiteReel = {
  id: string;
  brand: string;
  /** Slug of the matching Directory brand page (/directory/<slug>), when one exists. */
  brandSlug: string | null;
  title: string;
  href: string | null;
  category: ReelCategory;
  format: ReelFormat;
  seconds: number;
  photos: number;
  video: string;
  videoWebm: string | null;
  poster: string | null;
};

/** Files uploaded from the admin form are stored as `site-reels:<path>`. */
export const REEL_PREFIX = "site-reels:";
export const FORMAT_LABEL: Record<ReelFormat, string> = { "916": "9:16", "11": "1:1", "169": "16:9" };
