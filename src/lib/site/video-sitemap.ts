import type { SiteReel } from "./reels";
import { videoObjects } from "./video-schema";

type PageReels = { path: string; reelIds: string[] };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Google video sitemap: one <url> per page that embeds reels, one <video:video> per reel,
 * built from the same VideoObject data the pages carry so both always agree. */
export function videoSitemapXml(origin: string, pages: PageReels[], reels: SiteReel[]): string {
  const byId = new Map(reels.map((r) => [r.id, r]));
  const urls = pages.flatMap((p) => {
    const vids = videoObjects(p.reelIds.map((id) => byId.get(id)), p.path);
    if (!vids.length) return [];
    const body = vids.map((v) => [
      "    <video:video>",
      `      <video:thumbnail_loc>${esc(v.thumbnailUrl)}</video:thumbnail_loc>`,
      `      <video:title>${esc(v.name)}</video:title>`,
      `      <video:description>${esc(v.description.slice(0, 2048))}</video:description>`,
      `      <video:content_loc>${esc(v.contentUrl)}</video:content_loc>`,
      ...(v.duration ? [`      <video:duration>${v.duration.replace(/\D/g, "")}</video:duration>`] : []),
      `      <video:publication_date>${esc(v.uploadDate!)}</video:publication_date>`,
      "      <video:family_friendly>yes</video:family_friendly>",
      "    </video:video>",
    ].join("\n")).join("\n");
    return [`  <url>\n    <loc>${esc(origin + p.path)}</loc>\n${body}\n  </url>`];
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}
