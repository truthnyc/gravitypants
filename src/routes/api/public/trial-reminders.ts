import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily trial reminders (called by pg_cron): emails workspace owners whose
 * free trial ends in ~3 days, or ended in the last 24 hours. Only sends
 * emails, so it is safe to call without a caller secret; idempotency keys
 * dedupe repeats.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/public/trial-reminders")({
  server: {
    handlers: {
      POST: async () => {
        // The free trial no longer has a time limit (it ends when its exports are used),
        // so date-based "trial ending" emails are switched off.
        return Response.json({ sent: 0, disabled: true });
      },
      PUT: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const now = Date.now();

        const { data: rows } = await supabaseAdmin
          .from("workspace_billing")
          .select("workspace_id, trial_ends_at")
          .eq("plan", "trial")
          .eq("status", "trialing")
          .not("trial_ends_at", "is", null);

        let sent = 0;
        for (const row of rows ?? []) {
          const ends = new Date(row.trial_ends_at as string).getTime();
          const msLeft = ends - now;
          const ending = msLeft > 2 * DAY_MS && msLeft <= 4 * DAY_MS;
          const ended = msLeft <= 0 && msLeft > -DAY_MS;
          if (!ending && !ended) continue;

          const { data: m } = await supabaseAdmin
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", row.workspace_id)
            .eq("role", "owner")
            .maybeSingle();
          if (!m) continue;
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
          const email = u?.user?.email as string | undefined;
          if (!email) continue;
          const { data: p } = await supabaseAdmin
            .from("profiles")
            .select("display_name")
            .eq("user_id", m.user_id)
            .maybeSingle();
          const name = (p?.display_name as string | null) ?? undefined;

          const day = new Date().toISOString().slice(0, 10);
          const result = ending
            ? await sendTemplateEmail("trial-ending", email, {
                templateData: { name, daysLeft: Math.max(1, Math.round(msLeft / DAY_MS)) },
                idempotencyKey: `trial-ending-${row.workspace_id}-${day}`,
              })
            : await sendTemplateEmail("trial-ended", email, {
                templateData: { name },
                idempotencyKey: `trial-ended-${row.workspace_id}`,
              });
          if (result.sent) sent++;
        }
        return Response.json({ sent });
      },
    },
  },
});
