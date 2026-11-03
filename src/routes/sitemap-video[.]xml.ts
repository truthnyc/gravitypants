import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/lib/site/seo";
import { reelPages, videoSitemapXml } from "@/lib/site/video-sitemap";

/** Video sitemap for the public pages that embed published reels. */
export const Route = createFileRoute("/sitemap-video.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { pages, reels } = await reelPages();
        return new Response(videoSitemapXml(SITE_ORIGIN, pages, reels), {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
