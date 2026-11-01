import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/site/seo";
import { SEARCH_PAGES } from "@/lib/site/search-pages";
import { videoSitemapXml } from "@/lib/site/video-sitemap";

/** Video sitemap for the public pages that embed published reels. */
export const Route = createFileRoute("/sitemap-video.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { listSiteReels } = await import("@/lib/site/reels.functions");
        const reels = await listSiteReels();
        const pages = SEARCH_PAGES.map((p) => ({ path: p.path, reelIds: [p.example.reelId, ...("grid" in p.section ? p.section.grid : [])] }));
        return new Response(videoSitemapXml(SITE_ORIGIN, pages, reels), {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
