import { createFileRoute } from "@tanstack/react-router";

// Records "We'll be right back" occurrences in server logs. Logs only; stores and returns nothing.
export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { path?: unknown; message?: unknown; stack?: unknown };
          const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);
          console.error("[client-error]", JSON.stringify({
            at: new Date().toISOString(),
            host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
            path: clip(body.path, 300),
            message: clip(body.message, 500),
            stack: clip(body.stack, 2000),
            ua: clip(request.headers.get("user-agent"), 200),
          }));
        } catch { /* ignore malformed reports */ }
        return new Response(null, { status: 204 });
      },
    },
  },
});
