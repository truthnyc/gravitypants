import { createFileRoute } from "@tanstack/react-router";
import { BADGE_VARIANTS, badgeSvg, type BadgeVariant } from "@/lib/directory/badge";

export const Route = createFileRoute("/badge/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const v = params.file.replace(/\.svg$/, "") as BadgeVariant;
        if (!params.file.endsWith(".svg") || !BADGE_VARIANTS.includes(v)) return new Response("Not found", { status: 404 });
        return new Response(badgeSvg(v), { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400", "access-control-allow-origin": "*" } });
      },
    },
  },
});
