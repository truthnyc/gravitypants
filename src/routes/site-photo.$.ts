import { createFileRoute } from "@tanstack/react-router";

// Permanent public address for homepage photos chosen by staff (stored privately under
// site-reels/homepage/). Only that folder is served, so other private files stay private.
export const Route = createFileRoute("/site-photo/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = params._splat ?? "";
        if (!/^[0-9a-zA-Z_-]+\.(png|jpe?g|webp|gif)$/.test(name)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("site-reels").download(`homepage/${name}`);
        if (error || !data) return new Response("Not found", { status: 404 });
        const ext = name.split(".").pop()!.toLowerCase();
        const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        return new Response(data, { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
      },
    },
  },
});
