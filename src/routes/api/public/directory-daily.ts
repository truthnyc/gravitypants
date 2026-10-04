import { createFileRoute } from "@tanstack/react-router";

// Daily Directory upkeep: records plan ends/renewals and sends grace reminders.
// Only reads billing state and sends idempotent reminders, so it needs no caller secret
// beyond the shared cron secret when present.
export const Route = createFileRoute("/api/public/directory-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LOVABLE_CRON_SECRET"];
        if (secret && request.headers.get("x-cron-secret") !== secret) return new Response("Unauthorized", { status: 401 });
        const { runDirectoryDaily } = await import("@/lib/directory/directory.server");
        const result = await runDirectoryDaily();
        return Response.json(result);
      },
    },
  },
});
