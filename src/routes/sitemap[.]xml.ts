import { createFileRoute } from "@tanstack/react-router";
import { POSTS } from "@/lib/site/blog";
import { SITE_ORIGIN } from "@/lib/site/seo";

/** Public website pages only — the signed-in app under /app is never listed. */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/how-it-works", priority: "0.9", changefreq: "monthly" },
  { path: "/features", priority: "0.9", changefreq: "monthly" },
  { path: "/examples", priority: "0.9", changefreq: "weekly" },
  { path: "/showcase", priority: "0.8", changefreq: "weekly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/pricing", priority: "0.9", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "yearly" },
  { path: "/blog", priority: "0.7", changefreq: "weekly" },
  { path: "/help", priority: "0.6", changefreq: "monthly" },
  { path: "/signup", priority: "0.8", changefreq: "monthly" },
  { path: "/signin", priority: "0.4", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
];

function isoDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const today = new Date().toISOString().slice(0, 10);
        const entries = [
          ...PAGES.map(page => ({ loc: `${SITE_ORIGIN}${page.path === "/" ? "/" : page.path}`, lastmod: today, changefreq: page.changefreq, priority: page.priority })),
          ...POSTS.map(post => ({ loc: `${SITE_ORIGIN}/blog/${post.slug}`, lastmod: isoDate(post.date), changefreq: "yearly", priority: "0.5" })),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
          .map(e => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
