import type { SiteReel } from "./reels";
import video from "@/assets/site/photos_to_video_launch.mp4.asset.json";
import poster from "@/assets/site/photos_to_video_launch_poster.jpg.asset.json";

/** The Gravity Pants launch film, shown on the pages listed in LAUNCH_FILM_PAGES.
 * Shaped like a site reel so the page VideoObject and the video sitemap share one path. */
export const LAUNCH_FILM: SiteReel = {
  id: "launch-film",
  brand: "Gravity Pants",
  brandSlug: null,
  title: "Product video maker: turn photos into video",
  description: "See how Gravity Pants turns a few product photos into a short, on-brand product video for your store, social and ads, in under 20 seconds.",
  href: null,
  category: "other" as SiteReel["category"],
  format: "169",
  seconds: 19,
  photos: 3,
  video: video.url,
  videoWebm: null,
  poster: poster.url,
  uploadDate: "2026-11-02T09:00:00Z",
};

export const LAUNCH_FILM_PAGES = ["/product-video-maker"];
export const hasLaunchFilm = (path: string) => LAUNCH_FILM_PAGES.includes(path);
