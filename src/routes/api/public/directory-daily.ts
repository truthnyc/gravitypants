import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Daily Directory upkeep: records plan ends/renewals and sends grace reminders.
// It writes plan data and emails brand owners, so only the scheduled caller may run it.
export const Route = createFileRoute("/api/public/directory-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { runDirectoryDaily } = await import("@/lib/directory/directory.server");
        const result = await runDirectoryDaily();
        return Response.json(result);
      },
    },
  },
});
