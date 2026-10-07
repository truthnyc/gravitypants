import { createFileRoute } from "@tanstack/react-router";

// Permanent share-picture link for a brand page. Public by design: it only serves the same
// logo/poster the public brand page already shows, freshly fetched each time so it never expires.
export const Route = createFileRoute("/api/public/og/brand/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { getBrandPage } = await import("@/lib/directory/directory.functions");
        const page = await getBrandPage({ data: { slug: params.slug } }).catch(() => null);
        const b = page?.brand;
        const src = b ? (b.logo_url?.startsWith("https://") ? b.logo_url : page!.reels.find((r) => r.poster)?.poster) : null;
        if (!src) return new Response("Not found", { status: 404 });
        const res = await fetch(src);
        if (!res.ok || !res.body) return new Response("Not found", { status: 404 });
        return new Response(res.body, {
          headers: {
            "content-type": res.headers.get("content-type") ?? "image/jpeg",
            "cache-control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
