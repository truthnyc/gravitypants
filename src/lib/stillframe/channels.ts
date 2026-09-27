import type { Format } from "./types";
import { FORMAT_SIZE } from "@/render/formats";

export type Channel = { id: string; name: string; slug: string; format: Format };

export const CHANNELS: Channel[] = [
  { id: "ig-reels", name: "Instagram Reels & Stories", slug: "instagram-reels", format: "9:16" },
  { id: "tiktok", name: "TikTok", slug: "tiktok", format: "9:16" },
  { id: "yt-shorts", name: "YouTube Shorts", slug: "youtube-shorts", format: "9:16" },
  { id: "ig-feed", name: "Instagram & Facebook Feed", slug: "instagram-feed", format: "1:1" },
  { id: "linkedin", name: "LinkedIn Feed", slug: "linkedin", format: "1:1" },
  { id: "youtube", name: "YouTube", slug: "youtube", format: "16:9" },
  { id: "web", name: "Website & Banner", slug: "website-banner", format: "16:9" },
];

/** First channel for each format, used to preselect the ad's own formats. */
export const DEFAULT_CHANNEL: Record<Format, string> = { "9:16": "ig-reels", "1:1": "ig-feed", "16:9": "youtube" };

/** Nearest built-in ratio (compared on a log scale) so custom sizes reuse its positions. */
export function nearestFormat(w: number, h: number): Format {
  const r = Math.log(w / h);
  let best: Format = "1:1";
  let d = Infinity;
  for (const f of Object.keys(FORMAT_SIZE) as Format[]) {
    const s = FORMAT_SIZE[f];
    const dd = Math.abs(Math.log(s.width / s.height) - r);
    if (dd < d) {
      d = dd;
      best = f;
    }
  }
  return best;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "ad";
