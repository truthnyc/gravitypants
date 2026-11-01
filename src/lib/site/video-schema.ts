import type { SiteReel } from "./reels";
import { SITE_ORIGIN } from "./seo";

const abs = (u: string | null | undefined) => (!u ? null : u.startsWith("https://") ? u : u.startsWith("/") ? `${SITE_ORIGIN}${u}` : null);

/**
 * schema.org VideoObject for each reel embedded on a page, so Google can list them in video results.
 * Reels without an absolute video, thumbnail or upload date are skipped (Google requires all three).
 */
export function videoObjects(reels: (SiteReel | undefined)[], path: string) {
  const seen = new Set<string>();
  return reels.flatMap((r) => {
    if (!r || seen.has(r.id)) return [];
    // Signed storage links expire, so point Google at our permanent per-reel link instead.
    const stable = (u: string | null | undefined, kind: "video" | "poster") =>
      u && /[?&]token=/.test(u) ? `${SITE_ORIGIN}/api/public/reel/${encodeURIComponent(r.id)}/${kind}` : abs(u);
    const contentUrl = stable(r.video, "video");
    const thumbnailUrl = stable(r.poster, "poster");
    if (!contentUrl || !thumbnailUrl || !r.uploadDate) return [];
    seen.add(r.id);
    const name = `${r.brand} — ${r.displayTitle?.trim() || r.title} video ad`;
    const seconds = Math.max(1, Math.round(r.seconds || 0));
    return [{
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name,
      description: r.description?.trim() || `A short video ad for ${r.brand}, made from ${r.photos || "a few"} still photos with Gravity Pants.`,
      thumbnailUrl,
      contentUrl,
      uploadDate: r.uploadDate,
      ...(r.seconds ? { duration: `PT${seconds}S` } : {}),
      url: `${SITE_ORIGIN}${path}`,
      publisher: { "@type": "Organization", name: "Gravity Pants", logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/apple-touch-icon.png` } },
    }];
  });
}
