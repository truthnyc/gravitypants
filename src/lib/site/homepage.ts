import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import videoAsset from "@/assets/site/example-of-the-week.mp4.asset.json";
import webmAsset from "@/assets/site/example-of-the-week.webm.asset.json";
import posterAsset from "@/assets/site/example-of-the-week-poster.webp.asset.json";
import { FORMAT_LABEL, type SiteReel } from "./reels";

/** A photo is a bundled/CDN url or an uploaded `site-reels:<path>` ref; `src` is the viewable link. */
export type SitePhoto = { ref: string; alt: string; src?: string };

export type HomeHero = {
  announcement: string; announcementLink: string;
  line1: string; line2: string; lede: string;
  primary: string; secondary: string; note: string;
  reelId: string | null; photos: SitePhoto[];
};
export type ExampleOfWeek = { reelId: string | null; title: string; description: string; photos: SitePhoto[] };
export type HomeQuote = { quote: string; name: string; role: string; photo: SitePhoto | null };
export type HomepageContent = { hero: HomeHero; example: ExampleOfWeek; quote: HomeQuote };

const purl: SitePhoto[] = [
  { ref: photo1.url, alt: "Purl Soho Japanese Denim Cotton yarn product photo" },
  { ref: photo2.url, alt: "Purl Soho knitted denim cotton sweater photo" },
  { ref: photo3.url, alt: "Purl Soho denim cotton yarn skeins photo" },
];

export const DEFAULT_HERO: HomeHero = {
  announcement: "Export MP4 and GIF together", announcementLink: "See how it works",
  line1: "Photos in.", line2: "Reels out.",
  lede: "Turn your photos into video ads, Reels and GIFs. Add a few images and Gravity Pants makes a short video with your words, logo and colors, sized for Instagram, TikTok and Facebook.",
  primary: "Make your first reel", secondary: "Watch examples",
  note: "No editing experience needed. Your first reel is on us, without a watermark.",
  reelId: null, photos: purl,
};
export const DEFAULT_EXAMPLE: ExampleOfWeek = {
  reelId: null, title: "Japanese Denim Cotton",
  description: "A Purl Soho ad, from textured yarn and product details to a simple invitation to shop.",
  photos: purl,
};
export const DEFAULT_QUOTE: HomeQuote = {
  quote: "A few product photos, and a finished Instagram reel in minutes. It looks like our brand, not a template.",
  name: "",
  role: "Purl Soho",
  photo: null,
};
export const DEFAULT_CONTENT: HomepageContent = { hero: DEFAULT_HERO, example: DEFAULT_EXAMPLE, quote: DEFAULT_QUOTE };

export const photoSrc = (p: SitePhoto) => p.src ?? p.ref;

/** The video shown for a section: the chosen published reel, else the bundled Purl Soho reel. */
export type FeaturedVideo = { video: string; videoWebm?: string; poster: string; format: "916" | "169"; label: string; chips: string[] };
export function featuredVideo(reelId: string | null, reels: SiteReel[], photoCount: number): FeaturedVideo {
  const r = reelId ? reels.find((x) => x.id === reelId) : undefined;
  if (!r) return { video: videoAsset.url, videoWebm: webmAsset.url, poster: posterAsset.url, format: "916", label: "Purl Soho Japanese Denim Cotton video ad", chips: [`${photoCount || 3} photos`, "7.8 sec", "9:16", "Purl Soho"] };
  return {
    video: r.video, ...(r.videoWebm ? { videoWebm: r.videoWebm } : {}), poster: r.poster ?? posterAsset.url,
    format: r.format === "169" ? "169" : "916", label: `${r.brand} ${r.title} video ad`,
    chips: [`${r.photos} ${r.photos === 1 ? "photo" : "photos"}`, `${r.seconds} sec`, FORMAT_LABEL[r.format], r.brand],
  };
}
