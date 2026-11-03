import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/site/seo";
import { watchPages, watchReels, videoSitemapXml } from "@/lib/site/video-sitemap";

/** Video sitemap: each reel listed once, on its own /reels/<slug> watch page. */
export const Route = createFileRoute("/sitemap-video.xml")({
  server: {
    handlers: {
      GET: async () => new Response(videoSitemapXml(SITE_ORIGIN, watchPages(await watchReels())), {
        headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
      }),
    },
  },
});
