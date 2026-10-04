import { createFileRoute } from "@tanstack/react-router";

// Daily Directory upkeep: records plan ends/renewals and sends grace reminders.
// Idempotent (reminder counter + email dedupe keys), so like the other daily jobs it needs no caller secret.
export const Route = createFileRoute("/api/public/directory-daily")({
  server: {
    handlers: {
      POST: async () => {
        const { runDirectoryDaily } = await import("@/lib/directory/directory.server");
        const result = await runDirectoryDaily();
        return Response.json(result);
      },
    },
  },
});
