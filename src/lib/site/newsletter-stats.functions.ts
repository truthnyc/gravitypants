import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin-only newsletter report read live from Campaign Monitor.
export const newsletterStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await (context.supabase as any).rpc("is_platform_admin");
    if (ok !== true) throw new Response("Not found", { status: 404 });
    const key = process.env["CAMPAIGN_MONITOR_API_KEY"];
    const list = process.env["CAMPAIGN_MONITOR_LIST_ID"];
    if (!key || !list) return { status: "unavailable" as const, message: "Campaign Monitor isn't connected." };
    const auth = { Authorization: `Basic ${btoa(`${key}:x`)}` };
    const get = async (p: string) => {
      const r = await fetch(`https://api.createsend.com/api/v3.3/${p}`, { headers: auth });
      if (!r.ok) throw new Error(`${p} ${r.status}`);
      return r.json() as Promise<any>;
    };
    try {
      const [stats, unconf] = await Promise.all([
        get(`lists/${list}/stats.json`),
        get(`lists/${list}/unconfirmed.json?pagesize=10`).catch(() => ({ TotalNumberOfRecords: 0 })),
      ]);
      const emails: { journey: string; name: string; sent: number; opened: number; uniqueOpened: number; clicked: number }[] = [];
      try {
        const clients = await get("clients.json");
        for (const c of clients) {
          const journeys = await get(`clients/${c.ClientID}/journeys.json`);
          for (const j of journeys) {
            const d = await get(`journeys/${j.JourneyID}.json`);
            if (d.TriggerDetails?.ListID && d.TriggerDetails.ListID !== list) continue;
            for (const e of d.Emails ?? []) emails.push({ journey: j.Name, name: e.Name, sent: e.Sent ?? 0, opened: e.Opened ?? 0, uniqueOpened: e.UniqueOpened ?? 0, clicked: e.Clicked ?? 0 });
          }
        }
      } catch (e) { console.warn("journey stats", e); }
      return {
        status: "ok" as const,
        confirmed: stats.TotalActiveSubscribers ?? 0,
        pending: unconf.TotalNumberOfRecords ?? 0,
        week: stats.NewActiveSubscribersThisWeek ?? 0,
        month: stats.NewActiveSubscribersThisMonth ?? 0,
        unsubscribes: stats.TotalUnsubscribes ?? 0,
        bounces: stats.TotalBounces ?? 0,
        emails,
      };
    } catch (e) {
      console.error("newsletter stats", e);
      return { status: "unavailable" as const, message: "Couldn't reach Campaign Monitor." };
    }
  });
