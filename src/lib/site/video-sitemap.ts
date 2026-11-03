import type { SiteReel } from "./reels";
import { videoObject } from "./video-schema";
import { watchPath, watchSlugs } from "./watch";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export type WatchPage = { path: string; lastmod: string; video: string };

/** Every public reel's watch page plus the launch film, in the order the /reels index shows them. */
export async function watchReels(): Promise<SiteReel[]> {
  const { listSiteReels } = await import("./reels.functions");
  const { LAUNCH_FILM } = await import("./launch-film");
  return [...(await listSiteReels()), LAUNCH_FILM];
}

/** One sitemap entry per watch page with its single `<video:video>`, built from the same VideoObject the page carries. */
export function watchPages(reels: SiteReel[]): WatchPage[] {
  const slugs = watchSlugs(reels);
  return reels.flatMap((r) => {
    const slug = slugs.get(r.id)!;
    const v = videoObject(r, slug);
    if (!v) return [];
    const video = [
      "    <video:video>",
      `      <video:thumbnail_loc>${esc(v.thumbnailUrl)}</video:thumbnail_loc>`,
      `      <video:title>${esc(v.name)}</video:title>`,
      `      <video:description>${esc(v.description.slice(0, 2048))}</video:description>`,
      `      <video:content_loc>${esc(v.contentUrl)}</video:content_loc>`,
      ...(v.duration ? [`      <video:duration>${v.duration.replace(/\D/g, "")}</video:duration>`] : []),
      `      <video:publication_date>${esc(v.uploadDate!)}</video:publication_date>`,
      "      <video:family_friendly>yes</video:family_friendly>",
      "    </video:video>",
    ].join("\n");
    return [{ path: watchPath(slug), lastmod: v.uploadDate!.slice(0, 10), video }];
  });
}

export function videoSitemapXml(origin: string, pages: WatchPage[]): string {
  const urls = pages.map((p) => `  <url>\n    <loc>${esc(origin + p.path)}</loc>\n${p.video}\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}
