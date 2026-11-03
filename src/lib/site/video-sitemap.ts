import type { SiteReel } from "./reels";
import { videoObjects } from "./video-schema";

type PageReels = { path: string; reelIds: string[] };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Google video sitemap: one <url> per page that embeds reels, one <video:video> per reel,
 * built from the same VideoObject data the pages carry so both always agree. */
/** `<video:video>` blocks per page path, shared by /sitemap.xml and /sitemap-video.xml. */
export function videoBlocks(pages: PageReels[], reels: SiteReel[]): Map<string, string> {
  const byId = new Map(reels.map((r) => [r.id, r]));
  const out = new Map<string, string>();
  for (const p of pages) {
    const vids = videoObjects(p.reelIds.map((id) => byId.get(id)), p.path);
    if (!vids.length) continue;
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
    out.set(p.path, body);
  }
  return out;
}

/** The pages that embed reels, with the same reel lists they render and carry as VideoObject data. */
export async function reelPages(): Promise<{ pages: PageReels[]; reels: SiteReel[] }> {
  const { listSiteReels } = await import("./reels.functions");
  const { SEARCH_PAGES } = await import("./search-pages");
  const { LAUNCH_FILM, hasLaunchFilm } = await import("./launch-film");
  const reels = await listSiteReels();
  const studio = reels.filter((r) => r.source !== "client").map((r) => r.id);
  const all = reels.map((r) => r.id);
  const pages = [{ path: "/", reelIds: studio }, { path: "/examples", reelIds: all }, { path: "/showcase", reelIds: all }, ...SEARCH_PAGES.map((p) => ({ path: p.path, reelIds: [...(hasLaunchFilm(p.path) ? [LAUNCH_FILM.id] : []), p.example.reelId, ...("grid" in p.section ? p.section.grid : [])] }))];
  return { pages, reels: [LAUNCH_FILM, ...reels] };
}

export function videoSitemapXml(origin: string, pages: PageReels[], reels: SiteReel[]): string {
  const blocks = videoBlocks(pages, reels);
  const urls = [...blocks].map(([path, body]) => `  <url>\n    <loc>${esc(origin + path)}</loc>\n${body}\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}
