import type { SiteReel } from "./reels";
import { SITE_ORIGIN } from "./seo";
import { reelName, watchPath } from "./watch";

const abs = (u: string | null | undefined) => (!u ? null : u.startsWith("https://") ? u : u.startsWith("/") ? `${SITE_ORIGIN}${u}` : null);

/** Permanent absolute media link: signed storage links expire, so point at our per-reel link instead. */
export function stableMedia(r: SiteReel, kind: "video" | "poster") {
  const u = kind === "video" ? r.video : r.poster;
  return u && /[?&]token=/.test(u) ? `${SITE_ORIGIN}/api/public/reel/${encodeURIComponent(r.id)}/${kind}` : abs(u);
}

/**
 * schema.org VideoObject for a reel, placed only on its watch page (`url` = that page).
 * Null when the reel lacks an absolute video, thumbnail or upload date (Google requires all three).
 */
export function videoObject(r: SiteReel, slug: string) {
  const contentUrl = stableMedia(r, "video");
  const thumbnailUrl = stableMedia(r, "poster");
  if (!contentUrl || !thumbnailUrl || !r.uploadDate) return null;
  const seconds = Math.max(1, Math.round(r.seconds || 0));
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: reelName(r),
    description: r.description?.trim() || `A short video ad for ${r.brand}, made from ${r.photos || "a few"} still photos with Gravity Pants.`,
    thumbnailUrl,
    contentUrl,
    uploadDate: r.uploadDate,
    ...(r.seconds ? { duration: `PT${seconds}S` } : {}),
    url: `${SITE_ORIGIN}${watchPath(slug)}`,
    publisher: { "@type": "Organization", name: "Gravity Pants", logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/apple-touch-icon.png` } },
  };
}
