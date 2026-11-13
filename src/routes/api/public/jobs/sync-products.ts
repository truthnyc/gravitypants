import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Nightly price refresh for products added from a link. Called once a minute during the night;
 * each call re-reads at most one product per site, so no site gets more than one request per second.
 * Only `source_type = 'link'` rows are touched, and the brand's name is never overwritten.
 */
const DUE_MS = 20 * 60 * 60 * 1000;
const MAX_SITES = 8;

export const Route = createFileRoute("/api/public/jobs/sync-products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { fetchProductInfo } = await import("@/lib/directory/product-fetch.server");
        const db = supabaseAdmin as any;
        const due = new Date(Date.now() - DUE_MS).toISOString();
        const { data: rows } = await db.from("reel_products").select("id, url, sync_failures, last_synced_at")
          .eq("source_type", "link").or(`last_synced_at.is.null,last_synced_at.lt.${due}`)
          .order("last_synced_at", { ascending: true, nullsFirst: true }).limit(200);
        const perSite = new Map<string, any>();
        for (const r of rows ?? []) {
          let host = "";
          try { host = new URL(r.url).hostname; } catch { continue; }
          if (!perSite.has(host)) perSite.set(host, r);
          if (perSite.size >= MAX_SITES) break;
        }
        let ok = 0, failed = 0;
        await Promise.all([...perSite.values()].map(async (r) => {
          const now = new Date().toISOString();
          try {
            const info = await fetchProductInfo(r.url, 3000);
            if (info.price == null && info.availability === "unknown") throw new Error("no data");
            const patch: Record<string, unknown> = { last_synced_at: now, sync_failures: 0, availability: info.availability };
            if (info.price != null) patch.price = info.price;
            if (info.currency) patch.currency = info.currency;
            await db.from("reel_products").update(patch).eq("id", r.id).eq("source_type", "link");
            ok++;
          } catch {
            // Keep last known values; mark as tried tonight so the next call moves on.
            await db.from("reel_products").update({ sync_failures: (r.sync_failures ?? 0) + 1, last_synced_at: now }).eq("id", r.id).eq("source_type", "link");
            failed++;
          }
        }));
        return Response.json({ checked: perSite.size, ok, failed });
      },
    },
  },
});
