import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/site/seo";
import { SEARCH_PAGES } from "@/lib/site/search-pages";
import { LAUNCH_FILM, hasLaunchFilm } from "@/lib/site/launch-film";
import { videoSitemapXml } from "@/lib/site/video-sitemap";

/** Video sitemap for the public pages that embed published reels. */
export const Route = createFileRoute("/sitemap-video.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { listSiteReels } = await import("@/lib/site/reels.functions");
        const reels = await listSiteReels();
        const pages = SEARCH_PAGES.map((p) => ({ path: p.path, reelIds: [...(hasLaunchFilm(p.path) ? [LAUNCH_FILM.id] : []), p.example.reelId, ...("grid" in p.section ? p.section.grid : [])] }));
        return new Response(videoSitemapXml(SITE_ORIGIN, pages, [LAUNCH_FILM, ...reels]), {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
