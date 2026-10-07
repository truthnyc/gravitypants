import { createFileRoute } from "@tanstack/react-router";
import { AIMANTE_ORIGIN, siteForUrl } from "@/lib/site/brand-site";
import { SITE_ORIGIN } from "@/lib/site/seo";

const GP = `User-agent: *
Allow: /
Disallow: /app/
Disallow: /admin/
Disallow: /invite/
Disallow: /reset
Disallow: /api/
`;

const AIMANTE = `User-agent: *
Allow: /
Disallow: /api/
`;

/** Each domain gets its own rules and points at its own sitemap. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const aim = siteForUrl(new URL(request.url)) === "aimante";
        const body = `${aim ? AIMANTE : GP}\nSitemap: ${aim ? AIMANTE_ORIGIN : SITE_ORIGIN}/sitemap.xml\n`;
        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", vary: "host" } });
      },
    },
  },
});
