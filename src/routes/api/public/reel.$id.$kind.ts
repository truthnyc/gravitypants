import { createFileRoute } from "@tanstack/react-router";

// Permanent public link for a published reel's video or poster, used in Google video results.
// Public by design: it only resolves reels already shown on the public site (published site reels
// and live Showcase reels), then redirects to a fresh short-lived file link so it never expires.
export const Route = createFileRoute("/api/public/reel/$id/$kind")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (params.kind !== "video" && params.kind !== "poster") return new Response("Not found", { status: 404 });
        const { listSiteReels } = await import("@/lib/site/reels.functions");
        const reels = await listSiteReels().catch(() => []);
        const r = reels.find((x) => x.id === params.id);
        const src = r ? (params.kind === "video" ? r.video : r.poster) : null;
        if (!src?.startsWith("https://")) return new Response("Not found", { status: 404 });
        return new Response(null, {
          status: 302,
          headers: { location: src, "cache-control": "public, max-age=3600, s-maxage=3600" },
        });
      },
    },
  },
});
