import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Nightly feed refresh: called once a minute during the night, syncing the one feed that waited longest. */
const DUE_MS = 20 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/public/jobs/sync-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncSource } = await import("@/lib/directory/feed-sync.server");
        const db = supabaseAdmin as any;
        const due = new Date(Date.now() - DUE_MS).toISOString();
        const { data: src } = await db.from("brand_sources").select("id").or(`last_synced_at.is.null,last_synced_at.lt.${due}`).neq("status", "syncing")
          .order("last_synced_at", { ascending: true, nullsFirst: true }).limit(1).maybeSingle();
        if (!src) return Response.json({ synced: 0 });
        const r = await syncSource(db, src.id);
        // A failed feed is still marked as tried tonight so the next call moves on.
        if (!r.ok) await db.from("brand_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", src.id);
        return Response.json({ synced: 1, ok: r.ok });
      },
    },
  },
});
