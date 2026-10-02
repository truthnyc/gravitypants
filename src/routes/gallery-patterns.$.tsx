import { createFileRoute } from "@tanstack/react-router";
import { goneHandlers } from "@/lib/site/gone";

/** Old WordPress gallery pages: real HTTP 410 Gone for /gallery-patterns/*. */
export const Route = createFileRoute("/gallery-patterns/$")({
  server: { handlers: goneHandlers },
});
