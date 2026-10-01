import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Route = createFileRoute("/api/public/weekly-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { computeAnalytics, searchReport } = await import("@/lib/stillframe/analytics.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const db = supabaseAdmin as any;

        const today = new Date(); today.setUTCHours(0, 0, 0, 0);
        const d = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();
        const [cur, prev, search] = await Promise.all([computeAnalytics(db, d(7), d(0)), computeAnalytics(db, d(14), d(7)), searchReport().catch(() => null)]);
        const n = (x: number) => x.toLocaleString("en-US");
        const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
        const rows = [
          { label: "Visitors", value: n(cur.traffic.visitors), prev: n(prev.traffic.visitors) },
          { label: "Sign-ups", value: n(cur.funnel.signups), prev: n(prev.funnel.signups) },
          { label: "New paid plans", value: n(cur.revenue.newPaid), prev: n(prev.revenue.newPaid) },
          { label: "Exports", value: n(cur.exports), prev: n(prev.exports) },
          { label: "Monthly recurring revenue", value: money(cur.revenue.mrrCents), prev: "—" },
        ];
        const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const week = `${fmt(d(7))} – ${fmt(d(1))}`;

        const { data: roles } = await db.from("user_roles").select("user_id").eq("role", "admin");
        const { data: prefs } = await db.from("admin_report_prefs").select("user_id, weekly_email");
        const off = new Set((prefs ?? []).filter((p: any) => !p.weekly_email).map((p: any) => p.user_id));
        let sent = 0;
        for (const r of roles ?? []) {
          if (off.has(r.user_id)) continue;
          const { data: u } = await db.auth.admin.getUserById(r.user_id);
          const email = u?.user?.email;
          if (!email) continue;
          try {
            await sendTemplateEmail("weekly-report", email, {
              templateData: { week, rows, topSource: cur.marketing[0]?.source, topQuery: search?.status === "ok" ? search.queries[0]?.name : undefined },
              idempotencyKey: `weekly-report-${d(0).slice(0, 10)}-${r.user_id}`,
            });
            sent++;
          } catch (e) { console.error("weekly report send failed", e); }
        }
        return Response.json({ sent });
      },
    },
  },
});
