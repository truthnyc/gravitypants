import { createFileRoute } from "@tanstack/react-router";
import { POSTS } from "@/lib/site/blog";
import { SITE_ORIGIN } from "@/lib/site/seo";
import { AIMANTE_ORIGIN, siteForUrl } from "@/lib/site/brand-site";
import { CATEGORIES, categorySlug } from "@/lib/directory/directory";
import { listPublicBrands } from "@/lib/directory/directory.functions";

/** Public website pages only — the signed-in app under /app is never listed. */
/** lastmod = the date that page last really changed. Update it when you edit the page. */
const PAGES: { path: string; priority: string; changefreq: string; lastmod: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly", lastmod: "2026-09-30" },
  { path: "/how-it-works", priority: "0.9", changefreq: "monthly", lastmod: "2026-09-30" },
  { path: "/features", priority: "0.9", changefreq: "monthly", lastmod: "2026-09-30" },
  { path: "/examples", priority: "0.9", changefreq: "weekly", lastmod: "2026-09-30" },
  { path: "/showcase", priority: "0.8", changefreq: "weekly", lastmod: "2026-09-30" },
  // Directory intentionally not listed yet — the public Directory is not part of the marketing site.
  { path: "/contact", priority: "0.6", changefreq: "monthly", lastmod: "2026-09-30" },
  { path: "/pricing", priority: "0.9", changefreq: "monthly", lastmod: "2026-09-30" },
  { path: "/about", priority: "0.6", changefreq: "yearly", lastmod: "2026-09-30" },
  { path: "/blog", priority: "0.7", changefreq: "weekly", lastmod: "2026-09-30" },
  { path: "/help", priority: "0.6", changefreq: "monthly", lastmod: "2026-09-30" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly", lastmod: "2026-09-30" },
  { path: "/terms", priority: "0.3", changefreq: "yearly", lastmod: "2026-09-30" },
];

function isoDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (siteForUrl(new URL(request.url)) === "aimante") return xml(await aimanteEntries());
        // Directory pages intentionally not listed yet — the public Directory is not part of the marketing site.
        const entries = [
          ...PAGES.map(page => ({ loc: `${SITE_ORIGIN}${page.path}`, lastmod: page.lastmod, changefreq: page.changefreq, priority: page.priority })),
          ...POSTS.map(post => ({ loc: `${SITE_ORIGIN}/blog/${post.slug}`, lastmod: isoDate(post.date), changefreq: "yearly", priority: "0.5" })),
        ];
        return xml(entries);
      },
    },
  },
});

type Entry = { loc: string; lastmod: string; changefreq: string; priority: string };

/** aimante.co lists only its own pages: home, About, List your brand, every category and brand. */
async function aimanteEntries(): Promise<Entry[]> {
  const today = new Date().toISOString().slice(0, 10);
  const brands = await listPublicBrands().catch(() => [] as { slug: string }[]);
  return [
    { loc: `${AIMANTE_ORIGIN}/`, lastmod: today, changefreq: "daily", priority: "1.0" },
    { loc: `${AIMANTE_ORIGIN}/about`, lastmod: "2026-10-07", changefreq: "yearly", priority: "0.5" },
    { loc: `${AIMANTE_ORIGIN}/join`, lastmod: "2026-10-07", changefreq: "monthly", priority: "0.6" },
    ...CATEGORIES.map((c) => ({ loc: `${AIMANTE_ORIGIN}/c/${categorySlug(c)}`, lastmod: today, changefreq: "weekly", priority: "0.7" })),
    ...brands.map((b) => ({ loc: `${AIMANTE_ORIGIN}/b/${b.slug}`, lastmod: today, changefreq: "weekly", priority: "0.8" })),
  ];
}

function xml(entries: Entry[]) {
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
          .map(e => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600", vary: "host" } });
}
