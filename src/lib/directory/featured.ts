/** "Featured this week" band settings. Defaults until the admin settings page (directory settings) is connected. */
export type FeaturedSettings = {
  title: string;
  /** Seconds each reel takes to drift past; the full loop scales with the number of reels. */
  secondsPerReel: number;
  /** What the band shows while filters are on. */
  whenFiltering: "follow" | "fixed" | "hide";
  /** "auto" = featured-first, newest order; "manual" = the ids below, in order. */
  source: "auto" | "manual";
  manualIds: string[];
  max: number;
};
export const DEFAULT_FEATURED: FeaturedSettings = {
  title: "Featured this week", secondsPerReel: 5, whenFiltering: "follow", source: "auto", manualIds: [], max: 12,
};
