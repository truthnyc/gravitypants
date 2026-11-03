import { createFileRoute } from "@tanstack/react-router";
import { merchantFeedXml } from "@/lib/site/merchant-feed";

export const Route = createFileRoute("/merchant-feed.xml")({
  server: {
    handlers: {
      GET: () => new Response(merchantFeedXml(), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } }),
    },
  },
});
