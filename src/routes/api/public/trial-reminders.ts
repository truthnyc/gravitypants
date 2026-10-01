import { createFileRoute } from "@tanstack/react-router";

/**
 * Formerly sent date-based "trial ending" emails. The free trial no longer has a
 * time limit (it ends when its exports are used), so this endpoint now does nothing.
 * Kept so the existing daily scheduler call doesn't error.
 */
export const Route = createFileRoute("/api/public/trial-reminders")({
  server: {
    handlers: {
      POST: async () => Response.json({ sent: 0, disabled: true }),
    },
  },
});
