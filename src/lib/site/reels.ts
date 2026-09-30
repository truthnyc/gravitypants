export type ReelFormat = "916" | "11" | "169";
export type ReelCategory = "fashion" | "food" | "beauty" | "home";

/** A brand reel managed from /admin/reels; drives home, Examples and Showcase. */
export type SiteReel = {
  id: string;
  brand: string;
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
